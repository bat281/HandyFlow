"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { fieldErrors, formToObject, interventionSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const PHOTO_BUCKET = "intervention-photos";

function parseMaterials(json: string | undefined) {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveIntervention(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const interventionId = raw._id || null;
  if (interventionId && !/^[0-9a-f-]{36}$/i.test(interventionId)) return { message: "Identifiant invalide." };
  const materials = parseMaterials(raw.materials_json)
    .map((m: { name?: unknown; quantity?: unknown; unit?: unknown }) => ({
      name: String(m.name ?? "").trim(),
      quantity: m.quantity === "" || m.quantity == null ? null : Number(String(m.quantity).replace(",", ".")),
      unit: String(m.unit ?? "").trim() || null,
    }))
    .filter((m) => m.name !== "");

  const parsed = interventionSchema.safeParse({ ...raw, materials });
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error);
    if (Object.keys(errs).some((k) => k.startsWith("materials"))) errs.materials = ["Vérifiez les quantités des matériaux."];
    return { fieldErrors: errs, values: raw, message: "Veuillez corriger les champs indiqués." };
  }

  const { duration_hours, duration_mins, ...rest } = parsed.data;
  const total = duration_hours * 60 + duration_mins;
  const row = { ...rest, duration_minutes: total > 0 ? total : null };

  const { supabase, user, company } = await getSession();
  let id = interventionId;
  if (interventionId) {
    const { error } = await supabase.from("interventions").update(row).eq("id", interventionId);
    if (error) return { message: "Impossible d'enregistrer l'intervention.", values: raw };
  } else {
    const { data, error } = await supabase
      .from("interventions")
      .insert({ ...row, company_id: company.id, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      return {
        message: error?.code === "23503" ? "Client introuvable." : "Impossible de créer l'intervention.",
        values: raw,
      };
    }
    id = data.id;
  }
  revalidatePath("/interventions");
  revalidatePath("/tableau-de-bord");
  return { ok: true, values: raw, redirectTo: `/interventions/${id}?enregistre=1` };
}

export async function setInterventionStatus(id: string, status: "draft" | "completed"): Promise<ActionState> {
  const { supabase } = await getSession();
  const { error } = await supabase
    .from("interventions")
    .update({ status, ...(status === "draft" ? { completed_at: null } : {}) })
    .eq("id", id);
  if (error) return { message: "Impossible de modifier le statut." };
  revalidatePath(`/interventions/${id}`);
  revalidatePath("/interventions");
  revalidatePath("/tableau-de-bord");
  return { ok: true };
}

export async function deleteIntervention(id: string): Promise<ActionState> {
  const { supabase } = await getSession();
  const { data: photos } = await supabase.from("intervention_photos").select("storage_path").eq("intervention_id", id);
  const { error } = await supabase.from("interventions").delete().eq("id", id);
  if (error) return { message: "Impossible de supprimer l'intervention." };
  if (photos?.length) await supabase.storage.from(PHOTO_BUCKET).remove(photos.map((p) => p.storage_path));
  revalidatePath("/interventions");
  revalidatePath("/tableau-de-bord");
  return { ok: true, redirectTo: "/interventions?supprime=1" };
}

const photoPathsSchema = z.array(z.string().max(300)).min(1).max(30);

/** Registers photos already uploaded to Storage by the browser (RLS-checked upload). */
export async function addInterventionPhotos(interventionId: string, paths: string[]): Promise<ActionState> {
  const parsed = photoPathsSchema.safeParse(paths);
  if (!parsed.success) return { message: "Liste de photos invalide." };
  const { supabase, company } = await getSession();
  const prefix = `${company.id}/${interventionId}/`;
  if (!parsed.data.every((p) => p.startsWith(prefix) && !p.includes(".."))) return { message: "Chemin de photo invalide." };

  const { count } = await supabase.from("intervention_photos").select("id", { count: "exact", head: true }).eq("intervention_id", interventionId);
  const start = count ?? 0;
  const { error } = await supabase.from("intervention_photos").insert(
    parsed.data.map((storage_path, i) => ({ company_id: company.id, intervention_id: interventionId, storage_path, position: start + i })),
  );
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove(parsed.data);
    return { message: "Impossible d'enregistrer les photos." };
  }
  revalidatePath(`/interventions/${interventionId}`);
  return { ok: true };
}

export async function deleteInterventionPhoto(photoId: string): Promise<ActionState> {
  const { supabase } = await getSession();
  const { data: photo } = await supabase.from("intervention_photos").select("storage_path, intervention_id").eq("id", photoId).maybeSingle();
  if (!photo) return { message: "Photo introuvable." };
  const { error } = await supabase.from("intervention_photos").delete().eq("id", photoId);
  if (error) return { message: "Impossible de supprimer la photo." };
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  revalidatePath(`/interventions/${photo.intervention_id}`);
  return { ok: true };
}

export async function updatePhotoCaption(photoId: string, caption: string): Promise<ActionState> {
  const clean = caption.trim().slice(0, 200) || null;
  const { supabase } = await getSession();
  const { error } = await supabase.from("intervention_photos").update({ caption: clean }).eq("id", photoId);
  return error ? { message: "Impossible d'enregistrer la légende." } : { ok: true };
}
