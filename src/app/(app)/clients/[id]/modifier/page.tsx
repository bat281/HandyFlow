import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import type { Customer } from "@/lib/types";

export const metadata: Metadata = { title: "Modifier le client" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle<Customer>();
  if (!customer) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Modifier le client" backHref={`/clients/${id}`} />
      <CustomerForm customer={customer} />
    </div>
  );
}
