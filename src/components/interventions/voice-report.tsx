"use client";
import { useEffect, useRef, useState } from "react";
import { FileAudio, Loader2, Mic, Sparkles, Square, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Material } from "@/lib/types";

export type VoiceReportResult = {
  transcript: string;
  report: {
    work_type: string;
    description: string;
    materials: Material[];
    duration_minutes: number | null;
    observations: string;
    internal_notes: string;
  };
};

type Phase = "idle" | "recording" | "sending" | "thinking";

const MAX_SECONDS = 10 * 60;
const MAX_BYTES = 25 * 1024 * 1024;
// Chrome/Android/Firefox record WebM-Opus; Safari/iPhone records MP4-AAC.
const RECORDING_TYPES: { mime: string; ext: string; contentType: string }[] = [
  { mime: "audio/webm;codecs=opus", ext: "webm", contentType: "audio/webm" },
  { mime: "audio/webm", ext: "webm", contentType: "audio/webm" },
  { mime: "audio/mp4", ext: "mp4", contentType: "audio/mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg", contentType: "audio/ogg" },
];
const FILE_TYPES: Record<string, { ext: string; contentType: string }> = {
  "audio/webm": { ext: "webm", contentType: "audio/webm" },
  "audio/mp4": { ext: "m4a", contentType: "audio/mp4" },
  "audio/x-m4a": { ext: "m4a", contentType: "audio/mp4" },
  "audio/m4a": { ext: "m4a", contentType: "audio/mp4" },
  "audio/aac": { ext: "aac", contentType: "audio/aac" },
  "audio/mpeg": { ext: "mp3", contentType: "audio/mpeg" },
  "audio/mp3": { ext: "mp3", contentType: "audio/mpeg" },
  "audio/ogg": { ext: "ogg", contentType: "audio/ogg" },
  "audio/wav": { ext: "wav", contentType: "audio/wav" },
  "audio/x-wav": { ext: "wav", contentType: "audio/wav" },
};

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceReport({
  companyId,
  getContext,
  onResult,
}: {
  companyId: string;
  getContext: () => { customer?: string; workType?: string; date?: string };
  onResult: (r: VoiceReportResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => stopTracks(), []);

  function stopTracks() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Votre navigateur ne permet pas d'enregistrer. Utilisez « Importer un audio ».");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast.error("Accès au micro refusé. Autorisez le micro dans les réglages du navigateur.");
      return;
    }
    const type = RECORDING_TYPES.find((t) => MediaRecorder.isTypeSupported(t.mime));
    const rec = new MediaRecorder(stream, type ? { mimeType: type.mime, audioBitsPerSecond: 48_000 } : undefined);
    const actual = type ?? RECORDING_TYPES.find((t) => rec.mimeType.startsWith(t.contentType)) ?? RECORDING_TYPES[2];
    chunks.current = [];
    cancelled.current = false;
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      stopTracks();
      if (cancelled.current) return setPhase("idle");
      const blob = new Blob(chunks.current, { type: actual.contentType });
      void process(blob, actual.ext, actual.contentType);
    };
    recorder.current = rec;
    rec.start(1000);
    setSeconds(0);
    setPhase("recording");
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS && rec.state === "recording") rec.stop();
    }, 1000);
  }

  function stop(cancel = false) {
    cancelled.current = cancel;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function onFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const t = FILE_TYPES[file.type] ?? (/\.m4a$/i.test(file.name) ? FILE_TYPES["audio/mp4"] : undefined);
    if (!t) return toast.error("Format audio non pris en charge (m4a, mp3, webm, ogg ou wav).");
    await process(file, t.ext, t.contentType);
  }

  async function process(blob: Blob, ext: string, contentType: string) {
    if (blob.size < 2000) {
      setPhase("idle");
      return toast.error("Enregistrement trop court.");
    }
    if (blob.size > MAX_BYTES) {
      setPhase("idle");
      return toast.error("Fichier trop volumineux (25 Mo maximum).");
    }
    setPhase("sending");
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("intervention-audio").upload(path, blob, { contentType, upsert: false });
    if (error) {
      setPhase("idle");
      return toast.error("L'envoi de l'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
    }
    setPhase("thinking");
    try {
      const res = await fetch("/api/voice-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, ...getContext() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Le rapport n'a pas pu être généré.");
      onResult(data as VoiceReportResult);
      toast.success("Rapport pré-rempli. Relisez-le avant d'enregistrer.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le rapport n'a pas pu être généré.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4" /> Dicter le rapport</CardTitle>
        <CardDescription>
          Racontez l&apos;intervention à voix haute : problème constaté, travaux faits, matériel, temps passé, recommandations.
          L&apos;IA remplit le rapport ci-dessous, vous relisez avant d&apos;enregistrer.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {phase === "idle" && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="lg" onClick={start} className="flex-1 sm:flex-none">
              <Mic /> Démarrer la dictée
            </Button>
            <input ref={fileRef} type="file" accept="audio/*,.m4a" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" size="lg" variant="outline" onClick={() => fileRef.current?.click()}>
              <FileAudio /> Importer un audio
            </Button>
          </div>
        )}
        {phase === "recording" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 font-mono text-lg tabular-nums" aria-live="polite">
              <span className="size-3 animate-pulse rounded-full bg-red-600" aria-hidden /> {fmt(seconds)}
            </span>
            <Button type="button" size="lg" onClick={() => stop()} className="flex-1 sm:flex-none">
              <Square /> Terminer
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={() => stop(true)}>
              <X /> Annuler
            </Button>
            <p className="w-full text-xs text-muted-foreground">Maximum {MAX_SECONDS / 60} minutes.</p>
          </div>
        )}
        {(phase === "sending" || phase === "thinking") && (
          <p className="flex items-center gap-2 text-sm" aria-live="polite">
            <Loader2 className="size-4 animate-spin" />
            {phase === "sending" ? "Envoi de l'enregistrement…" : "Transcription et rédaction du rapport… (jusqu'à 30 secondes)"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
