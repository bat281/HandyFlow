"use client";
import { useActionState } from "react";
import { saveCompany } from "@/app/(app)/parametres/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState, Company } from "@/lib/types";

export function CompanyForm({ company }: { company: Company }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCompany, {});
  const e = state.fieldErrors ?? {};
  const val = (k: keyof Company) => state.values?.[k] ?? (company[k] == null ? "" : String(company[k]));
  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage ok={state.ok} message={state.message} />
      <FormField id="name" label="Raison sociale" error={e.name}>
        <Input id="name" name="name" required defaultValue={val("name")} aria-invalid={!!e.name} />
      </FormField>
      <FormField id="address_line" label="Adresse" optional error={e.address_line}>
        <Input id="address_line" name="address_line" defaultValue={val("address_line")} />
      </FormField>
      <div className="grid grid-cols-[8.5rem_1fr] gap-4">
        <FormField id="postal_code" label="NPA" optional error={e.postal_code}>
          <Input id="postal_code" name="postal_code" inputMode="numeric" maxLength={4} defaultValue={val("postal_code")} aria-invalid={!!e.postal_code} />
        </FormField>
        <FormField id="city" label="Localité" optional error={e.city}>
          <Input id="city" name="city" defaultValue={val("city")} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="phone" label="Téléphone" optional error={e.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={val("phone")} aria-invalid={!!e.phone} />
        </FormField>
        <FormField id="email" label="E-mail" optional error={e.email}>
          <Input id="email" name="email" type="email" defaultValue={val("email")} aria-invalid={!!e.email} />
        </FormField>
      </div>
      <FormField id="website" label="Site web" optional error={e.website}>
        <Input id="website" name="website" placeholder="www.exemple.ch" defaultValue={val("website")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="vat_number" label="N° TVA (IDE)" optional error={e.vat_number} hint="ex. CHE-123.456.789 TVA">
          <Input id="vat_number" name="vat_number" defaultValue={val("vat_number")} aria-invalid={!!e.vat_number} />
        </FormField>
        <FormField id="iban" label="IBAN" optional error={e.iban} hint="Utilisé sur les factures (phase 3)">
          <Input id="iban" name="iban" defaultValue={val("iban")} aria-invalid={!!e.iban} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="default_hourly_rate" label="Tarif horaire par défaut (CHF)" optional error={e.default_hourly_rate}>
          <Input id="default_hourly_rate" name="default_hourly_rate" inputMode="decimal" defaultValue={val("default_hourly_rate")} aria-invalid={!!e.default_hourly_rate} />
        </FormField>
        <FormField id="default_payment_terms_days" label="Délai de paiement (jours)" error={e.default_payment_terms_days}>
          <Input id="default_payment_terms_days" name="default_payment_terms_days" type="number" min={0} max={365} defaultValue={val("default_payment_terms_days")} aria-invalid={!!e.default_payment_terms_days} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <FormField id="document_accent_color" label="Couleur des documents" error={e.document_accent_color}>
          <Input id="document_accent_color" name="document_accent_color" type="color" className="h-10 p-1" defaultValue={val("document_accent_color")} />
        </FormField>
        <FormField id="document_footer" label="Pied de page des documents" optional error={e.document_footer}>
          <Textarea id="document_footer" name="document_footer" rows={2} className="min-h-10" placeholder="ex. Membre de suissetec" defaultValue={val("document_footer")} />
        </FormField>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton></div>
    </form>
  );
}
