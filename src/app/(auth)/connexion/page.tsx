import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">Accédez à votre espace HandyFlow.</p>
      </div>
      <LoginForm next={next} initialError={erreur === "lien" ? "Ce lien est invalide ou a expiré." : undefined} />
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link href="/inscription" className="font-medium text-brand hover:underline">Créer un compte</Link>
      </p>
    </div>
  );
}
