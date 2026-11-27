"use client";
import { useActionState } from "react";
import { saveProfile } from "@/app/(app)/parametres/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState, Profile } from "@/lib/types";

export function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, {});
  const e = state.fieldErrors ?? {};
  const val = (k: "first_name" | "last_name" | "phone") => state.values?.[k] ?? profile?.[k] ?? "";
  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="p_first_name" label="Prénom" error={e.first_name}>
          <Input id="p_first_name" name="first_name" defaultValue={val("first_name")} />
        </FormField>
        <FormField id="p_last_name" label="Nom" error={e.last_name}>
          <Input id="p_last_name" name="last_name" defaultValue={val("last_name")} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="p_phone" label="Téléphone" optional error={e.phone}>
          <Input id="p_phone" name="phone" type="tel" defaultValue={val("phone")} aria-invalid={!!e.phone} />
        </FormField>
        <FormField id="p_email" label="E-mail de connexion">
          <Input id="p_email" value={email} disabled readOnly />
        </FormField>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton></div>
    </form>
  );
}
