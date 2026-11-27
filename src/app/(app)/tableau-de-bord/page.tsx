import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, ClipboardList, FileClock, FileText, Plus, Receipt, Settings, UserPlus, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatDate, formatDateTime, fullName, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flash } from "@/components/flash";
import { InterventionStatusBadge } from "@/components/status-badge";
import type { InterventionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Tableau de bord" };

type Activity = { id: string; kind: "intervention" | "customer"; title: string; subtitle: string; at: string; href: string; status?: InterventionStatus };

export default async function DashboardPage() {
  const { supabase, profile } = await getSession();
  const monthStart = `${todayISO().slice(0, 7)}-01`;

  const [month, pending, quotes, invoices, recentI, recentC] = await Promise.all([
    supabase.from("interventions").select("id", { count: "exact", head: true }).gte("intervention_date", monthStart),
    supabase.from("interventions").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["sent", "overdue"]),
    supabase
      .from("interventions")
      .select("id, work_type, status, intervention_date, updated_at, customers(first_name, last_name)")
      .order("updated_at", { ascending: false })
      .limit(6)
      .returns<{ id: string; work_type: string; status: InterventionStatus; intervention_date: string; updated_at: string; customers: { first_name: string; last_name: string } | null }[]>(),
    supabase.from("customers").select("id, first_name, last_name, city, created_at").order("created_at", { ascending: false }).limit(4),
  ]);

  const activity: Activity[] = [
    ...(recentI.data ?? []).map((i) => ({
      id: i.id, kind: "intervention" as const, title: i.work_type,
      subtitle: `${i.customers ? fullName(i.customers) : ""} · ${formatDate(i.intervention_date)}`,
      at: i.updated_at, href: `/interventions/${i.id}`, status: i.status,
    })),
    ...(recentC.data ?? []).map((c) => ({
      id: c.id, kind: "customer" as const, title: `Nouveau client : ${fullName(c)}`, subtitle: c.city ?? "", at: c.created_at, href: `/clients/${c.id}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const stats = [
    { label: "Interventions ce mois", value: month.count ?? 0, icon: ClipboardList, href: "/interventions" },
    { label: "Rapports à compléter", value: pending.count ?? 0, icon: FileClock, href: "/interventions?statut=draft" },
    { label: "Devis en attente", value: quotes.count ?? 0, icon: FileText, soon: true },
    { label: "Factures impayées", value: invoices.count ?? 0, icon: Receipt, soon: true },
  ];

  return (
    <div className="grid gap-6">
      <Flash messages={{ motdepasse: "Mot de passe modifié" }} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(todayISO())}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour{profile?.first_name ? ` ${profile.first_name}` : ""}</h1>
        </div>
        <Button asChild size="lg" variant="brand" className="w-full sm:w-auto">
          <Link href="/interventions/nouvelle"><Plus className="size-5" /> Nouvelle intervention</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon, href, soon }) => {
          const body = (
            <Card className="h-full transition-colors hover:border-brand/40">
              <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium sm:text-sm">{label}</span>
                  <Icon className="size-4" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">{value}</span>
                  {soon && <span className="text-xs text-muted-foreground">bientôt</span>}
                </div>
              </CardContent>
            </Card>
          );
          return href ? <Link key={label} href={href}>{body}</Link> : <div key={label} title="Devis et factures arrivent dans une prochaine version">{body}</div>;
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader><CardTitle className="text-base">Activité récente</CardTitle></CardHeader>
          <CardContent className="p-2 sm:p-3">
            {activity.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Rien pour l&apos;instant. Ajoutez un client puis une intervention pour commencer.</p>
            ) : (
              <ul className="divide-y">
                {activity.map((a) => (
                  <li key={`${a.kind}-${a.id}`}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/60">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                        {a.kind === "intervention" ? <ClipboardCheck className="size-4" /> : <Users className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.subtitle} · {formatDateTime(a.at)}</p>
                      </div>
                      {a.status && <InterventionStatusBadge status={a.status} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Accès rapide</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start"><Link href="/interventions/nouvelle"><Plus /> Nouvelle intervention</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/clients/nouveau"><UserPlus /> Nouveau client</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/interventions?statut=draft"><FileClock /> Rapports à compléter</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link href="/parametres"><Settings /> Informations de l&apos;entreprise</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
