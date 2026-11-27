import Link from "next/link";
import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">Indiquez votre e-mail, nous vous enverrons un lien pour en choisir un nouveau.</p>
      </div>
      <ResetRequestForm />
      <p className="text-center text-sm"><Link href="/connexion" className="text-brand hover:underline">Retour à la connexion</Link></p>
    </div>
  );
}
