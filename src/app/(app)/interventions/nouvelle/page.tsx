import Link from "next/link";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { getSession } from "@/lib/session";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InterventionForm } from "@/components/interventions/intervention-form";

export const metadata: Metadata = { title: "Nouvelle intervention" };

export default async function NewInterventionPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const { supabase, company } = await getSession();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, company_name, address_line, postal_code, city")
    .order("last_name")
    .limit(1000);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nouvelle intervention" description="Les photos s'ajoutent à l'étape suivante." backHref="/interventions" />
      {!customers?.length ? (
        <EmptyState
          icon={UserPlus}
          title="Commencez par ajouter un client"
          description="Chaque intervention est liée à un client."
          action={<Button asChild><Link href="/clients/nouveau?retour=intervention"><UserPlus /> Ajouter un client</Link></Button>}
        />
      ) : (
        <InterventionForm companyId={company.id} customers={customers} defaultCustomerId={client} today={todayISO()} />
      )}
    </div>
  );
}
