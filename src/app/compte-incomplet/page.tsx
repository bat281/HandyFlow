import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Compte incomplet" };

/** Shown when a signed-in user has no company the app can read (setup problem). */
export default function IncompleteAccountPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 text-center shadow-xs">
        <Logo />
        <AlertTriangle className="mx-auto size-8 text-warning" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Votre espace n&apos;est pas encore prêt</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte est bien créé, mais les informations de votre entreprise sont inaccessibles.
            Réessayez dans quelques minutes ou contactez le support.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild><a href="/tableau-de-bord">Réessayer</a></Button>
          <form action="/auth/deconnexion" method="post"><Button type="submit" variant="outline" className="w-full">Se déconnecter</Button></form>
        </div>
      </div>
    </div>
  );
}
