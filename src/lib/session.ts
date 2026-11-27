import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company, Profile } from "@/lib/types";

/**
 * Current user + profile + active company. Redirects to login when signed out.
 * Authorization is enforced by RLS; this only picks the active company.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, current_company_id")
    .eq("id", user.id)
    .single<Profile>();

  let companyId = profile?.current_company_id ?? null;
  if (!companyId) {
    const { data: m } = await supabase.from("company_members").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
    companyId = m?.company_id ?? null;
  }
  if (!companyId) throw new Error("Aucune entreprise associée à ce compte.");

  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId).single<Company>();
  if (!company) throw new Error("Entreprise introuvable.");

  return { supabase, user, profile, company };
});
