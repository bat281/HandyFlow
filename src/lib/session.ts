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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, current_company_id")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError) console.error("[session] profile query failed", profileError);
  let companyId = profile?.current_company_id ?? null;
  if (!companyId) {
    const { data: m, error } = await supabase.from("company_members").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (error) console.error("[session] membership query failed", error);
    companyId = m?.company_id ?? null;
  }
  // Missing company (or a database that denies access): show a recovery page, never crash.
  if (!companyId) redirect("/compte-incomplet");

  const { data: company, error: companyError } = await supabase.from("companies").select("*").eq("id", companyId).single<Company>();
  if (!company) {
    console.error("[session] company query failed", companyError);
    redirect("/compte-incomplet");
  }

  return { supabase, user, profile, company };
});
