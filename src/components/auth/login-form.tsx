"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/(auth)/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";
import { useRedirectOnSuccess } from "@/hooks/use-redirect-on-success";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(login, { message: initialError });
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage ok={state.ok} message={state.message} />
      <FormField id="email" label="E-mail" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.values?.email} aria-invalid={!!e.email} />
      </FormField>
      <FormField id="password" label="Mot de passe" error={e.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!e.password} />
      </FormField>
      <div className="-mt-1 text-right text-sm">
        <Link href="/mot-de-passe-oublie" className="text-brand hover:underline">Mot de passe oublié ?</Link>
      </div>
      <SubmitButton size="lg" pendingLabel="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
