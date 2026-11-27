import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatAddress, fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { ListSkeleton } from "@/components/list-skeleton";
import type { Customer } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <>
      <Flash messages={{ supprime: "Client supprimé" }} />
      <PageHeader
        title="Clients"
        actions={<Button asChild><Link href="/clients/nouveau"><Plus /> Nouveau client</Link></Button>}
      />
      <form className="relative mb-4" role="search">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Rechercher par nom, entreprise, localité…" className="pl-9" aria-label="Rechercher un client" />
      </form>
      <Suspense key={q} fallback={<ListSkeleton />}>
        <CustomerList q={q} />
      </Suspense>
    </>
  );
}

async function CustomerList({ q }: { q: string }) {
  const { supabase } = await getSession();
  let query = supabase.from("customers").select("*").order("last_name").order("first_name").limit(200);
  const term = q.trim().replace(/[%,()]/g, " ").slice(0, 80);
  if (term) {
    const like = `%${term}%`;
    query = query.or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},city.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }
  const { data: customers, error } = await query.returns<Customer[]>();
  if (error) throw error;

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={term ? "Aucun client trouvé" : "Aucun client pour l'instant"}
        description={term ? "Essayez un autre terme de recherche." : "Ajoutez votre premier client pour pouvoir enregistrer des interventions."}
        action={!term && <Button asChild><Link href="/clients/nouveau"><Plus /> Ajouter un client</Link></Button>}
      />
    );
  }
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">{customers.length} client{customers.length > 1 ? "s" : ""}{term ? " trouvé(s)" : ""}</p>
      <Card className="divide-y overflow-hidden">
        {customers.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {(c.first_name[0] ?? "") + (c.last_name[0] ?? "")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{fullName(c)}{c.company_name && <span className="font-normal text-muted-foreground"> · {c.company_name}</span>}</p>
              <p className="truncate text-sm text-muted-foreground">{formatAddress(c) || c.phone || c.email || "—"}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </Card>
    </>
  );
}
