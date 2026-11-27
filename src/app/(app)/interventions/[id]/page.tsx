import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download, Eye, Pencil } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatAddress, formatDate, formatDateTime, formatDuration, fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Flash } from "@/components/flash";
import { InterventionStatusBadge } from "@/components/status-badge";
import { PhotoManager } from "@/components/interventions/photo-manager";
import { DeleteInterventionButton, StatusToggle } from "@/components/interventions/intervention-actions";
import type { Customer, Intervention, InterventionPhoto } from "@/lib/types";

export const metadata: Metadata = { title: "Intervention" };

export default async function InterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, company } = await getSession();
  const { data: intervention } = await supabase
    .from("interventions")
    .select("*, customers(*)")
    .eq("id", id)
    .maybeSingle<Intervention & { customers: Customer }>();
  if (!intervention) notFound();

  const { data: photoRows } = await supabase
    .from("intervention_photos")
    .select("id, intervention_id, storage_path, caption, position")
    .eq("intervention_id", id)
    .order("position")
    .returns<InterventionPhoto[]>();
  const photosList = photoRows ?? [];
  const { data: signed } = photosList.length
    ? await supabase.storage.from("intervention-photos").createSignedUrls(photosList.map((p) => p.storage_path), 3600)
    : { data: [] };
  const photos = photosList.map((p, i) => ({ id: p.id, caption: p.caption, url: signed?.[i]?.signedUrl ?? null }));

  const c = intervention.customers;
  const location = formatAddress({
    address_line: intervention.location_address, postal_code: intervention.location_postal_code, city: intervention.location_city,
  });

  return (
    <>
      <Flash messages={{ enregistre: "Intervention enregistrée" }} />
      <PageHeader
        title={intervention.work_type}
        backHref="/interventions"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(intervention.intervention_date)} · <Link href={`/clients/${c.id}`} className="hover:underline">{fullName(c)}</Link>
            <InterventionStatusBadge status={intervention.status} />
            {intervention.report_number && <span className="tabular-nums">N° {intervention.report_number}</span>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/interventions/${id}/modifier`}><Pencil /> Modifier</Link></Button>
            <StatusToggle id={id} status={intervention.status} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Travaux effectués</CardTitle></CardHeader>
            <CardContent>
              {intervention.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{intervention.description}</p> : <Missing />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Matériel utilisé</CardTitle></CardHeader>
            <CardContent>
              {intervention.materials.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Désignation</th><th className="pb-2 text-right font-medium">Quantité</th></tr></thead>
                  <tbody className="divide-y">
                    {intervention.materials.map((m, i) => (
                      <tr key={i}><td className="py-2">{m.name}</td><td className="py-2 text-right tabular-nums">{m.quantity ?? "—"} {m.unit ?? ""}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <Missing text="Aucun matériel indiqué." />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Observations et recommandations</CardTitle></CardHeader>
            <CardContent>{intervention.observations ? <p className="whitespace-pre-wrap text-sm">{intervention.observations}</p> : <Missing text="Aucune observation." />}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Photos ({photos.length})</CardTitle></CardHeader>
            <CardContent><PhotoManager companyId={company.id} interventionId={id} photos={photos} /></CardContent>
          </Card>
        </div>

        <div className="grid h-fit gap-6">
          <Card className="border-brand/30 bg-accent/40">
            <CardHeader><CardTitle className="text-base">Rapport PDF</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="brand"><a href={`/api/interventions/${id}/pdf?download=1`}><Download /> Télécharger le PDF</a></Button>
              <Button asChild variant="outline"><a href={`/api/interventions/${id}/pdf`} target="_blank" rel="noopener"><Eye /> Aperçu</a></Button>
              <p className="text-xs text-muted-foreground">
                {intervention.status === "draft" ? "Le rapport porte la mention « Brouillon » tant qu'il n'est pas terminé." : `Terminé le ${formatDateTime(intervention.completed_at)}.`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Détails</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Detail label="Client">{fullName(c)}{c.company_name ? `, ${c.company_name}` : ""}</Detail>
              <Detail label="Lieu">{location || "—"}</Detail>
              <Detail label="Temps passé">{formatDuration(intervention.duration_minutes)}</Detail>
              {intervention.notes && <Detail label="Notes internes"><span className="whitespace-pre-wrap">{intervention.notes}</span></Detail>}
            </CardContent>
          </Card>
          <DeleteInterventionButton id={id} />
        </div>
      </div>
    </>
  );
}

function Missing({ text = "Non renseigné." }: { text?: string }) {
  return <p className="text-sm text-muted-foreground italic">{text}</p>;
}
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
