import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClipboardList, Mail, MapPin, Pencil, Phone, Plus, StickyNote } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatAddress, formatDate, formatDuration, fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { InterventionStatusBadge } from "@/components/status-badge";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import type { Customer, Intervention } from "@/lib/types";

export const metadata: Metadata = { title: "Client" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const [{ data: customer }, { data: interventions }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle<Customer>(),
    supabase
      .from("interventions")
      .select("id, intervention_date, work_type, status, duration_minutes, location_city, report_number")
      .eq("customer_id", id)
      .order("intervention_date", { ascending: false })
      .returns<Pick<Intervention, "id" | "intervention_date" | "work_type" | "status" | "duration_minutes" | "location_city" | "report_number">[]>(),
  ]);
  if (!customer) notFound();
  const name = fullName(customer);
  const address = formatAddress(customer);
  const history = interventions ?? [];

  return (
    <>
      <Flash messages={{ enregistre: "Client enregistré" }} />
      <PageHeader
        title={name}
        description={customer.company_name}
        backHref="/clients"
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/clients/${id}/modifier`}><Pencil /> Modifier</Link></Button>
            <DeleteCustomerButton id={id} name={name} />
            <Button asChild><Link href={`/interventions/nouvelle?client=${id}`}><Plus /> Intervention</Link></Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <InfoRow icon={Phone}>{customer.phone ? <a className="hover:underline" href={`tel:${customer.phone.replace(/\s/g, "")}`}>{customer.phone}</a> : "—"}</InfoRow>
            <InfoRow icon={Mail}>{customer.email ? <a className="break-all hover:underline" href={`mailto:${customer.email}`}>{customer.email}</a> : "—"}</InfoRow>
            <InfoRow icon={MapPin}>{address || "—"}</InfoRow>
            {customer.notes && <InfoRow icon={StickyNote}><span className="whitespace-pre-wrap">{customer.notes}</span></InfoRow>}
          </CardContent>
        </Card>
        <section className="space-y-3">
          <h2 className="font-semibold">Historique des interventions <span className="font-normal text-muted-foreground">({history.length})</span></h2>
          {history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucune intervention" description="Les interventions de ce client apparaîtront ici." />
          ) : (
            <Card className="divide-y overflow-hidden">
              {history.map((i) => (
                <Link key={i.id} href={`/interventions/${i.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/60">
                  <span className="w-24 text-sm tabular-nums text-muted-foreground">{formatDate(i.intervention_date)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{i.work_type}</span>
                  <span className="text-sm text-muted-foreground">{formatDuration(i.duration_minutes)}</span>
                  <InterventionStatusBadge status={i.status} />
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

function InfoRow({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
