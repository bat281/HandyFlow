import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { transcribe, TranscriptionConfigError } from "@/lib/ai/transcribe";
import { AiConfigError, generateReport } from "@/lib/ai/report";
import { UserFacingError } from "@/lib/ai/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Transcription + AI drafting usually takes 10–40 s.
export const maxDuration = 120;

const AUDIO_BUCKET = "intervention-audio";
const MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT || 200);

const bodySchema = z.object({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webm|mp4|m4a|ogg|mp3|wav|aac)$/i),
  customer: z.string().max(300).optional(),
  workType: z.string().max(120).optional(),
  date: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const { path, ...context } = parsed.data;
  const companyId = path.split("/")[0];

  try {
    // Monthly cap per company, so a bug or abuse can't run up the AI bill.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", monthStart.toISOString());
    if ((count ?? 0) >= MONTHLY_LIMIT) {
      return NextResponse.json({ error: `Limite mensuelle de ${MONTHLY_LIMIT} rapports IA atteinte.` }, { status: 429 });
    }

    // RLS on storage: only members of that company can read the file.
    const { data: audio, error: dlError } = await supabase.storage.from(AUDIO_BUCKET).download(path);
    if (dlError || !audio) return NextResponse.json({ error: "Enregistrement introuvable" }, { status: 404 });

    const { text: transcript, seconds } = await transcribe(audio, path.split("/")[1]);
    if (transcript.length < 5) {
      return NextResponse.json({ error: "Aucune parole détectée. Parlez plus près du micro et réessayez." }, { status: 422 });
    }

    const { report, usage } = await generateReport(transcript, context);

    const { error: usageError } = await supabase.from("ai_usage").insert({
      company_id: companyId,
      user_id: user.id,
      kind: "voice_report",
      audio_seconds: seconds,
      input_tokens: usage.input,
      output_tokens: usage.output,
    });
    if (usageError) console.error("[voice-report] usage log failed", usageError);

    return NextResponse.json({ transcript, report });
  } catch (err) {
    if (err instanceof TranscriptionConfigError || err instanceof AiConfigError) {
      console.error("[voice-report] configuration", err.message);
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[voice-report] failed", err);
    const message = err instanceof UserFacingError ? err.message : "Le rapport n'a pas pu être généré. Réessayez.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    // Privacy: the raw recording is not kept once processed (the transcript is).
    await supabase.storage.from(AUDIO_BUCKET).remove([path]).then(
      ({ error }) => error && console.error("[voice-report] audio cleanup failed", error),
    );
  }
}
