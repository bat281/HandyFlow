import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { UserFacingError } from "./errors";

export const REPORT_MODEL = process.env.AI_REPORT_MODEL || "claude-opus-5-5";

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
  duration_minutes: z.number().int().nullable().describe("Temps passé sur place en minutes, null si non mentionné."),
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

export async function generateReport(transcript: string, context: { workType?: string; customer?: string; date?: string }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiConfigError("IA non configurée : ajoutez ANTHROPIC_API_KEY dans les variables d'environnement.");
  }
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

  const ctx = [
    context.customer && `Client : ${context.customer}`,
    context.date && `Date : ${context.date}`,
    context.workType && `Type de travaux déjà saisi : ${context.workType}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: REPORT_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(aiReportSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${ctx ? `${ctx}\n\n` : ""}<transcription>\n${transcript}\n</transcription>`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new UserFacingError("L'IA n'a pas pu traiter cette note. Réessayez ou saisissez le rapport à la main.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new UserFacingError("La réponse de l'IA est incomplète. Réessayez.");

  return {
    report: response.parsed_output,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
