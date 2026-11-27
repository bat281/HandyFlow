"use client";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/app/(auth)/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/types";
import { useRedirectOnSuccess } from "@/hooks/use-redirect-on-success";

export function ResetRequestForm() {
  const [state, action] = useActionState<ActionState, FormData>(requestPasswordReset, {});
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <FormField id="email" label="E-mail" error={e.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={!!e.email} />
      </FormField>
      <SubmitButton size="lg" pendingLabel="Envoi…">Envoyer le lien</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(updatePassword, {});
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage message={state.message} />
      <FormField id="password" label="Nouveau mot de passe" error={e.password} hint="Au moins 8 caractères">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!e.password} />
      </FormField>
      <FormField id="password_confirm" label="Confirmer" error={e.password_confirm}>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required aria-invalid={!!e.password_confirm} />
      </FormField>
      <SubmitButton size="lg" pendingLabel="Enregistrement…">Enregistrer le mot de passe</SubmitButton>
    </form>
  );
}
