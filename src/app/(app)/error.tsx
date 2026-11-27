"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-14 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Une erreur est survenue</p>
        <p className="text-sm text-muted-foreground">La page n&apos;a pas pu être chargée. Vérifiez votre connexion et réessayez.</p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
