import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
        <p className="text-sm text-muted-foreground">Quelques informations pour démarrer. Vous pourrez tout compléter ensuite.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link href="/connexion" className="font-medium text-brand hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
