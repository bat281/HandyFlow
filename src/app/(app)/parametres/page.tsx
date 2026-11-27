import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CompanyForm } from "@/components/settings/company-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { LogoUpload } from "@/components/settings/logo-upload";
import { NewPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { supabase, user, profile, company } = await getSession();
  const logoUrl = company.logo_path
    ? (await supabase.storage.from("company-assets").createSignedUrl(company.logo_path, 3600)).data?.signedUrl ?? null
    : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Paramètres" description="Ces informations apparaissent sur vos rapports, devis et factures." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
          <CardDescription>Affiché en haut de vos documents PDF.</CardDescription>
        </CardHeader>
        <CardContent><LogoUpload companyId={company.id} logoUrl={logoUrl} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Entreprise</CardTitle></CardHeader>
        <CardContent><CompanyForm company={company} /></CardContent>
      </Card>
      <Card id="profil">
        <CardHeader><CardTitle className="text-base">Mon profil</CardTitle></CardHeader>
        <CardContent><ProfileForm profile={profile} email={user.email ?? ""} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Mot de passe</CardTitle></CardHeader>
        <CardContent><NewPasswordForm /></CardContent>
      </Card>
    </div>
  );
}
