import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatDate, formatDuration, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { ListSkeleton } from "@/components/list-skeleton";
import { InterventionStatusBadge } from "@/components/status-badge";
import type { InterventionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Interventions" };

type Row = {
  id: string; intervention_date: string; work_type: string; status: InterventionStatus; duration_minutes: number | null;
  location_city: string | null; customers: { first_name: string; last_name: string; company_name: string | null } | null;
};

const FILTERS = [
  { key: "", label: "Toutes" },
  { key: "draft", label: "À compléter" },
  { key: "completed", label: "Terminées" },
] as const;

export default async function InterventionsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut = "" } = await searchParams;
  return (
    <>
      <Flash messages={{ supprime: "Intervention supprimée" }} />
      <PageHeader
        title="Interventions"
        actions={<Button asChild variant="brand"><Link href="/interventions/nouvelle"><Plus /> Nouvelle intervention</Link></Button>}
      />
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 sm:w-fit" role="tablist">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/interventions?statut=${f.key}` : "/interventions"}
            role="tab"
            aria-selected={statut === f.key}
            className={cn("flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium text-muted-foreground sm:flex-none", statut === f.key && "bg-card text-foreground shadow-xs")}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <Suspense key={statut} fallback={<ListSkeleton />}>
        <InterventionList statut={statut} />
      </Suspense>
    </>
  );
}

async function InterventionList({ statut }: { statut: string }) {
  const { supabase } = await getSession();
  let q = supabase
    .from("interventions")
    .select("id, intervention_date, work_type, status, duration_minutes, location_city, customers(first_name, last_name, company_name)")
    .order("intervention_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (statut === "draft" || statut === "completed") q = q.eq("status", statut);
  const { data, error } = await q.returns<Row[]>();
  if (error) throw error;

  if (data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune intervention"
        description="Enregistrez votre première intervention pour générer un rapport PDF."
        action={<Button asChild variant="brand"><Link href="/interventions/nouvelle"><Plus /> Nouvelle intervention</Link></Button>}
      />
    );
  }
  return (
    <Card className="divide-y overflow-hidden">
      {data.map((i) => (
        <Link key={i.id} href={`/interventions/${i.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60">
          <div className="w-14 shrink-0 text-center">
            <div className="text-lg font-semibold leading-none tabular-nums">{formatDate(i.intervention_date).slice(0, 2)}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{formatDate(i.intervention_date).slice(3)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{i.work_type}</p>
            <p className="truncate text-sm text-muted-foreground">
              {i.customers ? fullName(i.customers) : "—"}{i.location_city ? ` · ${i.location_city}` : ""} · {formatDuration(i.duration_minutes)}
            </p>
          </div>
          <InterventionStatusBadge status={i.status} />
          <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
        </Link>
      ))}
    </Card>
  );
}
