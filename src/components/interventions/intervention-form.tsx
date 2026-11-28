"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { saveIntervention } from "@/app/(app)/interventions/actions";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { useRedirectOnSuccess } from "@/hooks/use-redirect-on-success";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { MaterialsEditor } from "./materials-editor";
import { VoiceReport, type VoiceReportResult } from "./voice-report";
import type { ActionState, Customer, Intervention, Material } from "@/lib/types";

export const WORK_TYPES = [
  "Dépannage", "Installation", "Réparation", "Entretien", "Rénovation",
  "Plomberie", "Électricité", "Chauffage", "Peinture", "Contrôle / diagnostic",
];

type CustomerOption = Pick<Customer, "id" | "first_name" | "last_name" | "company_name" | "address_line" | "postal_code" | "city">;

export function InterventionForm({
  companyId, customers, intervention, defaultCustomerId, today,
}: { companyId: string; customers: CustomerOption[]; intervention?: Intervention; defaultCustomerId?: string; today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveIntervention, {});
  useRedirectOnSuccess(state);
  const e = state.fieldErrors ?? {};
  const v = state.values;
  const val = (k: keyof Intervention) => v?.[k] ?? (intervention?.[k] as string | null) ?? "";
  const addrRef = useRef<HTMLInputElement>(null);
  const npaRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);

  const materials: Material[] = v?.materials_json
    ? safeJson(v.materials_json)
    : (intervention?.materials ?? []);
  const formRef = useRef<HTMLFormElement>(null);
  const [materialsState, setMaterialsState] = useState({ key: 0, items: materials });
  const [transcript, setTranscript] = useState(v?.voice_transcript ?? intervention?.voice_transcript ?? "");

  function field(name: string) {
    return formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  }

  function voiceContext() {
    const sel = field("customer_id") as HTMLSelectElement | null;
    return {
      customer: sel?.selectedOptions[0]?.value ? sel.selectedOptions[0].text : undefined,
      workType: field("work_type")?.value || undefined,
      date: field("intervention_date")?.value || undefined,
    };
  }

  /** Fills the report from the AI draft. Empty fields are filled, filled ones get the draft appended. */
  function applyVoiceReport({ transcript: t, report: r }: VoiceReportResult) {
    const fill = (name: string, text: string) => {
      const el = field(name);
      if (!el || !text.trim()) return;
      el.value = el.value.trim() ? `${el.value.trim()}\n\n${text.trim()}` : text.trim();
    };
    const wt = field("work_type");
    if (wt && !wt.value.trim() && r.work_type.trim()) wt.value = r.work_type.trim();
    fill("description", r.description);
    fill("observations", r.observations);
    fill("notes", r.internal_notes);
    if (r.duration_minutes != null && r.duration_minutes > 0) {
      const h = field("duration_hours"), m = field("duration_mins");
      if (h && m && !Number(h.value) && !Number(m.value)) {
        h.value = String(Math.floor(r.duration_minutes / 60));
        m.value = String(r.duration_minutes % 60);
      }
    }
    if (r.materials.length) {
      const current = safeJson(field("materials_json")?.value ?? "[]").filter((x) => x.name.trim());
      setMaterialsState((s) => ({ key: s.key + 1, items: [...current, ...r.materials] }));
    }
    setTranscript((prev) => (prev ? `${prev}\n\n---\n\n${t}` : t));
    field("description")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const dh = v?.duration_hours ?? (intervention?.duration_minutes != null ? String(Math.floor(intervention.duration_minutes / 60)) : "");
  const dm = v?.duration_mins ?? (intervention?.duration_minutes != null ? String(intervention.duration_minutes % 60) : "");

  function prefillLocation(customerId: string) {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    if (addrRef.current && !addrRef.current.value) addrRef.current.value = c.address_line ?? "";
    if (npaRef.current && !npaRef.current.value) npaRef.current.value = c.postal_code ?? "";
    if (cityRef.current && !cityRef.current.value) cityRef.current.value = c.city ?? "";
  }

  return (
    <form ref={formRef} action={action} noValidate className="grid gap-6">
      <input type="hidden" name="_id" value={intervention?.id ?? ""} />
      <input type="hidden" name="voice_transcript" value={transcript} />
      <FormMessage message={state.message} />

      <Card>
        <CardHeader><CardTitle className="text-base">Client et lieu</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <FormField id="customer_id" label="Client" error={e.customer_id}>
            <div className="flex gap-2">
              <div className="flex-1">
                <NativeSelect
                  id="customer_id"
                  name="customer_id"
                  required
                  defaultValue={val("customer_id") || defaultCustomerId || ""}
                  onChange={(ev) => prefillLocation(ev.target.value)}
                  aria-invalid={!!e.customer_id}
                >
                  <option value="" disabled>Choisir un client…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.last_name} {c.first_name}{c.company_name ? ` — ${c.company_name}` : ""}{c.city ? ` (${c.city})` : ""}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {!intervention && (
                <Button asChild variant="outline" size="icon" aria-label="Nouveau client">
                  <Link href="/clients/nouveau?retour=intervention"><UserPlus /></Link>
                </Button>
              )}
            </div>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="intervention_date" label="Date de l'intervention" error={e.intervention_date}>
              <Input id="intervention_date" name="intervention_date" type="date" required defaultValue={val("intervention_date") || today} aria-invalid={!!e.intervention_date} />
            </FormField>
            <FormField id="work_type" label="Type de travaux" error={e.work_type}>
              <Input id="work_type" name="work_type" list="work-types" required placeholder="ex. Dépannage" defaultValue={val("work_type")} aria-invalid={!!e.work_type} />
              <datalist id="work-types">{WORK_TYPES.map((w) => <option key={w} value={w} />)}</datalist>
            </FormField>
          </div>
          <FormField id="location_address" label="Lieu de l'intervention" optional error={e.location_address} hint="Repris de l'adresse du client si laissé vide lors du choix du client">
            <Input ref={addrRef} id="location_address" name="location_address" placeholder="Rue et numéro" defaultValue={val("location_address")} />
          </FormField>
          <div className="grid grid-cols-[8.5rem_1fr] gap-4">
            <FormField id="location_postal_code" label="NPA" optional error={e.location_postal_code}>
              <Input ref={npaRef} id="location_postal_code" name="location_postal_code" inputMode="numeric" maxLength={4} defaultValue={val("location_postal_code")} aria-invalid={!!e.location_postal_code} />
            </FormField>
            <FormField id="location_city" label="Localité" optional error={e.location_city}>
              <Input ref={cityRef} id="location_city" name="location_city" defaultValue={val("location_city")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <VoiceReport companyId={companyId} getContext={voiceContext} onResult={applyVoiceReport} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rapport d&apos;intervention</CardTitle>
          <CardDescription>Ces informations figurent sur le rapport PDF remis au client.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField id="description" label="Travaux effectués" optional error={e.description}>
            <Textarea id="description" name="description" rows={6} placeholder="Décrivez le problème constaté et les travaux réalisés…" defaultValue={val("description")} />
          </FormField>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Matériel utilisé</span>
            <MaterialsEditor key={materialsState.key} initial={materialsState.items} error={e.materials} />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Temps passé</legend>
            <div className="flex items-center gap-2">
              <Input aria-label="Heures" name="duration_hours" type="number" min={0} max={999} inputMode="numeric" className="w-24" defaultValue={dh} aria-invalid={!!e.duration_hours} />
              <span className="text-sm text-muted-foreground">h</span>
              <Input aria-label="Minutes" name="duration_mins" type="number" min={0} max={59} step={5} inputMode="numeric" className="w-24" defaultValue={dm} aria-invalid={!!e.duration_mins} />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            {(e.duration_hours || e.duration_mins) && <p className="text-sm text-destructive">Durée invalide (minutes entre 0 et 59).</p>}
          </fieldset>
          <FormField id="observations" label="Observations et recommandations" optional error={e.observations}>
            <Textarea id="observations" name="observations" rows={3} placeholder="ex. Prévoir le remplacement du chauffe-eau d'ici 2 ans" defaultValue={val("observations")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes internes</CardTitle>
          <CardDescription>Visibles uniquement par vous, jamais imprimées.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" name="notes" aria-label="Notes internes" rows={3} defaultValue={val("notes")} />
          {transcript && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Transcription de la dictée</summary>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-muted-foreground">{transcript}</p>
            </details>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button asChild variant="ghost"><Link href={intervention ? `/interventions/${intervention.id}` : "/interventions"}>Annuler</Link></Button>
          <SubmitButton size="lg" pendingLabel="Enregistrement…">{intervention ? "Enregistrer" : "Créer l'intervention"}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}

function safeJson(s: string): Material[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a.map((m) => ({ name: m.name ?? "", quantity: m.quantity === "" ? null : m.quantity, unit: m.unit ?? null })) : [];
  } catch {
    return [];
  }
}
