"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { customerSchema, fieldErrors, formToObject } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function saveCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const customerId = raw._id || null;
  if (customerId && !/^[0-9a-f-]{36}$/i.test(customerId)) return { message: "Identifiant invalide." };
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: raw, message: "Veuillez corriger les champs indiqués." };

  const { supabase, user, company } = await getSession();
  let id = customerId;
  if (customerId) {
    const { error } = await supabase.from("customers").update(parsed.data).eq("id", customerId);
    if (error) return { message: "Impossible d'enregistrer le client.", values: raw };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...parsed.data, company_id: company.id, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return { message: "Impossible de créer le client.", values: raw };
    id = data.id;
  }
  revalidatePath("/clients");
  revalidatePath("/tableau-de-bord");
  const returnTo = raw.return_to;
  if (returnTo === "intervention") return { ok: true, values: raw, redirectTo: `/interventions/nouvelle?client=${id}` };
  return { ok: true, values: raw, redirectTo: `/clients/${id}?enregistre=1` };
}

export async function deleteCustomer(customerId: string): Promise<ActionState> {
  const { supabase } = await getSession();
  const { count } = await supabase
    .from("interventions")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  if ((count ?? 0) > 0) {
    return {
      message: `Ce client a ${count} intervention(s) enregistrée(s). Supprimez-les d'abord pour conserver un historique cohérent.`,
    };
  }
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  if (error) return { message: "Impossible de supprimer le client." };
  revalidatePath("/clients");
  return { ok: true, redirectTo: "/clients?supprime=1" };
}
