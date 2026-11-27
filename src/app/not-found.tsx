import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="space-y-4 text-center">
        <p className="text-5xl font-semibold text-primary">404</p>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Button asChild><Link href="/tableau-de-bord">Retour au tableau de bord</Link></Button>
      </div>
    </div>
  );
}
