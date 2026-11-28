import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { UserFacingError } from "./errors";


export const aiReportSchema = z.object({
  work_type: z.string().describe("Type de travaux, court (ex. « Dépannage », « Installation »). Chaîne vide si inconnu."),
  description: z
    .string()
    .describe("Travaux effectués, rédigés pour le client : constat puis travaux réalisés. Phrases complètes, ton professionnel."),
  materials: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().nullable(),
        unit: z.string().nullable().describe("pce, m, kg, l…"),
      }),
    )
    .describe("Matériel posé ou utilisé. Liste vide si aucun n'est mentionné."),
  duration_minutes: z.number().nullable().describe("Temps passé sur place en minutes, null si non mentionné."),
  observations: z.string().describe("Remarques et recommandations pour le client. Chaîne vide s'il n'y en a pas."),
  internal_notes: z
    .string()
    .describe("Ce qui ne doit pas figurer sur le rapport client (prix d'achat, rappel interne, suivi). Chaîne vide sinon."),
});
export type AiReport = z.infer<typeof aiReportSchema>;

export class AiConfigError extends Error {}

const SYSTEM = `Tu es l'assistant administratif d'un artisan en Suisse romande.
Tu reçois la transcription brute d'une note vocale dictée par l'artisan après une intervention.
Tu en tires un rapport d'intervention clair, destiné au client final.

Règles :
- Écris en français, avec l'usage de Suisse romande (septante, huitante, nonante), un ton professionnel et factuel. Écris les quantités et les nombres en chiffres.
- N'invente rien : uniquement ce que la note dit ou implique clairement. Si une information manque, laisse le champ vide ou null.
- Corrige les hésitations, répétitions et erreurs de transcription évidentes (termes de métier mal reconnus).
- « Travaux effectués » : décris d'abord le problème constaté, puis ce qui a été fait. Pas de listes à puces sauf si l'artisan énumère des étapes.
- Matériel : une ligne par article avec quantité et unité quand elles sont dites. N'indique jamais de prix.
- Durée : convertis en minutes (« une heure et demie » = 90). Ne compte pas le trajet sauf si l'artisan le demande.
- Mets dans les notes internes ce qui n'a pas sa place devant le client.`;

type Context = { workType?: string; customer?: string; date?: string };
type Result = { report: AiReport; usage: { input: number | null; output: number | null }; provider: string };

function userMessage(transcript: string, context: Context) {
  const ctx = [
    context.customer && `Client : ${context.customer}`,
    context.date && `Date : ${context.date}`,
    context.workType && `Type de travaux déjà saisi : ${context.workType}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${ctx ? `${ctx}\n\n` : ""}<transcription>\n${transcript}\n</transcription>`;
}

/**
 * Turns a transcript into a structured report.
 * Provider: AI_REPORT_PROVIDER ("mistral" | "anthropic"), else Claude when ANTHROPIC_API_KEY is set,
 * else Mistral (works on Mistral's free plan with the same key as transcription).
 */
export async function generateReport(transcript: string, context: Context): Promise<Result> {
  const wanted = process.env.AI_REPORT_PROVIDER?.toLowerCase();
  if (wanted === "anthropic" || (!wanted && process.env.ANTHROPIC_API_KEY)) return withClaude(transcript, context);
  if (wanted === "mistral" || (!wanted && process.env.MISTRAL_API_KEY)) return withMistral(transcript, context);
  throw new AiConfigError("IA non configurée : ajoutez MISTRAL_API_KEY (ou ANTHROPIC_API_KEY) dans les variables d'environnement.");
}

async function withClaude(transcript: string, context: Context): Promise<Result> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiConfigError("IA non configurée : ANTHROPIC_API_KEY manquante.");
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const response = await client.beta.messages.parse({
    model: process.env.AI_REPORT_MODEL || "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(aiReportSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage(transcript, context) }],
  });

  if (response.stop_reason === "refusal") throw new UserFacingError("L'IA n'a pas pu traiter cette note. Réessayez ou saisissez le rapport à la main.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new UserFacingError("La réponse de l'IA est incomplète. Réessayez.");

  return {
    report: response.parsed_output,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    provider: "anthropic",
  };
}

// Tried in order: on Mistral's free plan some models have no quota (429/403), so we move on to the next.
const MISTRAL_MODELS = (process.env.AI_REPORT_MODEL || "mistral-small-latest,ministral-14b-latest,ministral-8b-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const { $schema: _ignored, ...reportJsonSchema } = z.toJSONSchema(aiReportSchema, { target: "draft-7" });
void _ignored;

async function withMistral(transcript: string, context: Context): Promise<Result> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new AiConfigError("IA non configurée : MISTRAL_API_KEY manquante.");

  let lastStatus = 0;
  for (const model of MISTRAL_MODELS) {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4000,
        response_format: {
          type: "json_schema",
          json_schema: { name: "rapport_intervention", schema: reportJsonSchema, strict: true },
        },
        messages: [
          { role: "system", content: `${SYSTEM}\n\nRéponds uniquement avec un objet JSON conforme au schéma fourni.` },
          { role: "user", content: userMessage(transcript, context) },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      lastStatus = res.status;
      console.error(`[report] mistral ${model} ${res.status}`, (await res.text().catch(() => "")).slice(0, 300));
      // No quota / model not allowed / unknown model on this plan: try the next one.
      if ([400, 403, 404, 429].includes(res.status)) continue;
      break;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | { type: string; text?: string }[] }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = data.choices?.[0];
    const raw = choice?.message?.content;
    const text = typeof raw === "string" ? raw : (raw ?? []).map((c) => c.text ?? "").join("");
    if (choice?.finish_reason === "length") throw new UserFacingError("La réponse de l'IA est incomplète. Réessayez.");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[report] mistral returned invalid JSON", text.slice(0, 300));
      continue;
    }
    const parsed = aiReportSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[report] mistral JSON did not match schema", parsed.error.issues.slice(0, 3));
      continue;
    }
    return {
      report: parsed.data,
      usage: { input: data.usage?.prompt_tokens ?? null, output: data.usage?.completion_tokens ?? null },
      provider: `mistral:${model}`,
    };
  }
  throw new UserFacingError(
    lastStatus === 429
      ? "Le service d'IA est momentanément saturé (limite du plan gratuit). Réessayez dans une minute."
      : "Le rapport n'a pas pu être généré. Réessayez.",
  );
}
