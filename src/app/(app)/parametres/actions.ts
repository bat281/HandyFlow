"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { companySchema, fieldErrors, formToObject, profileSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function saveCompany(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = companySchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: raw, message: "Veuillez corriger les champs indiqués." };
  const { supabase, company } = await getSession();
  const data = { ...parsed.data, iban: parsed.data.iban?.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim() ?? null };
  const { error } = await supabase.from("companies").update(data).eq("id", company.id);
  if (error) return { message: "Impossible d'enregistrer. Seuls les administrateurs peuvent modifier l'entreprise.", values: raw };
  revalidatePath("/", "layout");
  return { ok: true, message: "Informations de l'entreprise enregistrées." };
}

export async function saveProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: raw };
  const { supabase, user } = await getSession();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { message: "Impossible d'enregistrer le profil.", values: raw };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil enregistré." };
}

export async function setCompanyLogo(path: string | null): Promise<ActionState> {
  const { supabase, company } = await getSession();
  if (path !== null && (!path.startsWith(`${company.id}/`) || path.includes(".."))) return { message: "Chemin invalide." };
  const previous = company.logo_path;
  const { error } = await supabase.from("companies").update({ logo_path: path }).eq("id", company.id);
  if (error) return { message: "Impossible d'enregistrer le logo." };
  if (previous && previous !== path) await supabase.storage.from("company-assets").remove([previous]);
  revalidatePath("/parametres");
  return { ok: true };
}
