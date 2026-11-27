import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NewPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Choisir un nouveau mot de passe" />
      <Card><CardContent><NewPasswordForm /></CardContent></Card>
    </div>
  );
}
