import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { todayISO } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { InterventionForm } from "@/components/interventions/intervention-form";
import type { Intervention } from "@/lib/types";

export const metadata: Metadata = { title: "Modifier l'intervention" };

export default async function EditInterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, company } = await getSession();
  const [{ data: intervention }, { data: customers }] = await Promise.all([
    supabase.from("interventions").select("*").eq("id", id).maybeSingle<Intervention>(),
    supabase.from("customers").select("id, first_name, last_name, company_name, address_line, postal_code, city").order("last_name").limit(1000),
  ]);
  if (!intervention) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Modifier l'intervention" backHref={`/interventions/${id}`} />
      <InterventionForm companyId={company.id} customers={customers ?? []} intervention={intervention} today={todayISO()} />
    </div>
  );
}
