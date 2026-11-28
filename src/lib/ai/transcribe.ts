import "server-only";
import { UserFacingError } from "./errors";

/**
 * Speech-to-text. Two providers speak the same multipart API shape:
 * - Mistral Voxtral (default): EU company, data processed in the EU, strong French.
 * - OpenAI gpt-4o-transcribe: alternative if you already have an OpenAI account.
 * The provider is chosen from TRANSCRIPTION_PROVIDER, else from whichever key is set.
 */
type Provider = { name: "mistral" | "openai"; url: string; key: string; model: string };

export class TranscriptionConfigError extends Error {}

function provider(): Provider {
  const wanted = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase();
  const mistral = process.env.MISTRAL_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if ((wanted === "mistral" || !wanted) && mistral) {
    return {
      name: "mistral",
      url: "https://api.mistral.ai/v1/audio/transcriptions",
      key: mistral,
      model: process.env.TRANSCRIPTION_MODEL || "voxtral-mini-latest",
    };
  }
  if ((wanted === "openai" || !wanted) && openai) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/audio/transcriptions",
      key: openai,
      model: process.env.TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
    };
  }
  throw new TranscriptionConfigError(
    "Transcription non configurée : ajoutez MISTRAL_API_KEY (ou OPENAI_API_KEY) dans les variables d'environnement.",
  );
}

export async function transcribe(audio: Blob, filename: string): Promise<{ text: string; seconds: number | null; provider: string }> {
  const p = provider();
  const form = new FormData();
  form.append("model", p.model);
  form.append("language", "fr");
  form.append("file", audio, filename);

  const res = await fetch(p.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.key}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[transcribe] ${p.name} ${res.status}`, detail.slice(0, 500));
    throw new UserFacingError(`Le service de transcription a refusé l'enregistrement (${res.status}).`);
  }
  const data = (await res.json()) as { text?: string; usage?: { prompt_audio_seconds?: number }; duration?: number };
  return {
    text: (data.text ?? "").trim(),
    seconds: data.usage?.prompt_audio_seconds ?? data.duration ?? null,
    provider: p.name,
  };
}
