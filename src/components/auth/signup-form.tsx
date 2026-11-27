"use client";
import { useActionState } from "react";
import { signup } from "@/app/(auth)/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";
import { useRedirectOnSuccess } from "@/hooks/use-redirect-on-success";

export function SignupForm() {
  const [state, action] = useActionState<ActionState, FormData>(signup, {});
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  const val = state.values ?? {};
  if (state.ok && !state.redirectTo) return <FormMessage ok message={state.message} />;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage message={state.message} />
      <div className="grid grid-cols-2 gap-3">
        <FormField id="first_name" label="Prénom" error={e.first_name}>
          <Input id="first_name" name="first_name" autoComplete="given-name" required defaultValue={val.first_name} aria-invalid={!!e.first_name} />
        </FormField>
        <FormField id="last_name" label="Nom" error={e.last_name}>
          <Input id="last_name" name="last_name" autoComplete="family-name" required defaultValue={val.last_name} aria-invalid={!!e.last_name} />
        </FormField>
      </div>
      <FormField id="company_name" label="Nom de l'entreprise" error={e.company_name}>
        <Input id="company_name" name="company_name" autoComplete="organization" required defaultValue={val.company_name} aria-invalid={!!e.company_name} />
      </FormField>
      <FormField id="email" label="E-mail professionnel" error={e.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={val.email} aria-invalid={!!e.email} />
      </FormField>
      <FormField id="password" label="Mot de passe" error={e.password} hint="Au moins 8 caractères">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!e.password} />
      </FormField>
      <FormField id="password_confirm" label="Confirmer le mot de passe" error={e.password_confirm}>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required aria-invalid={!!e.password_confirm} />
      </FormField>
      <SubmitButton size="lg" pendingLabel="Création du compte…">Créer mon compte</SubmitButton>
    </form>
  );
}
