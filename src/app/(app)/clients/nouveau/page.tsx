import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata: Metadata = { title: "Nouveau client" };

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const { retour } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nouveau client" backHref={retour === "intervention" ? "/interventions/nouvelle" : "/clients"} />
      <CustomerForm returnTo={retour} />
    </div>
  );
}
