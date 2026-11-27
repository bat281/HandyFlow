"use client";
import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer } from "@/app/(app)/clients/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { useRedirectOnSuccess } from "@/hooks/use-redirect-on-success";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState, Customer } from "@/lib/types";

export function CustomerForm({ customer, returnTo }: { customer?: Customer; returnTo?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCustomer, {});
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  const val = (k: keyof Customer) => state.values?.[k] ?? (customer?.[k] as string | null) ?? "";
  const cancelHref = customer ? `/clients/${customer.id}` : returnTo === "intervention" ? "/interventions/nouvelle" : "/clients";

  return (
    <form action={action} noValidate>
      <input type="hidden" name="return_to" value={returnTo ?? ""} />
      <input type="hidden" name="_id" value={customer?.id ?? ""} />
      <Card>
        <CardContent className="grid gap-5">
          <FormMessage message={state.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="first_name" label="Prénom" error={e.first_name}>
              <Input id="first_name" name="first_name" autoComplete="off" required defaultValue={val("first_name")} aria-invalid={!!e.first_name} />
            </FormField>
            <FormField id="last_name" label="Nom" error={e.last_name}>
              <Input id="last_name" name="last_name" autoComplete="off" required defaultValue={val("last_name")} aria-invalid={!!e.last_name} />
            </FormField>
          </div>
          <FormField id="company_name" label="Entreprise" optional error={e.company_name}>
            <Input id="company_name" name="company_name" defaultValue={val("company_name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="email" label="E-mail" optional error={e.email}>
              <Input id="email" name="email" type="email" inputMode="email" defaultValue={val("email")} aria-invalid={!!e.email} />
            </FormField>
            <FormField id="phone" label="Téléphone" optional error={e.phone}>
              <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+41 79 123 45 67" defaultValue={val("phone")} aria-invalid={!!e.phone} />
            </FormField>
          </div>
          <FormField id="address_line" label="Adresse" optional error={e.address_line}>
            <Input id="address_line" name="address_line" placeholder="Rue et numéro" defaultValue={val("address_line")} />
          </FormField>
          <div className="grid grid-cols-[8.5rem_1fr] gap-4">
            <FormField id="postal_code" label="NPA" optional error={e.postal_code}>
              <Input id="postal_code" name="postal_code" inputMode="numeric" maxLength={4} placeholder="1003" defaultValue={val("postal_code")} aria-invalid={!!e.postal_code} />
            </FormField>
            <FormField id="city" label="Localité" optional error={e.city}>
              <Input id="city" name="city" placeholder="Lausanne" defaultValue={val("city")} />
            </FormField>
          </div>
          <FormField id="notes" label="Notes" optional error={e.notes}>
            <Textarea id="notes" name="notes" rows={4} placeholder="Code d'accès, préférences, remarques…" defaultValue={val("notes")} />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <Button asChild variant="ghost"><Link href={cancelHref}>Annuler</Link></Button>
          <SubmitButton pendingLabel="Enregistrement…">{customer ? "Enregistrer" : "Créer le client"}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
