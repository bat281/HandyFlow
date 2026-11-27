"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, loginSchema, newPasswordSchema, resetRequestSchema, signupSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

async function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/tableau-de-bord";
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email: raw.email ?? "" } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Veuillez confirmer votre adresse e-mail avant de vous connecter."
        : "E-mail ou mot de passe incorrect.";
    return { message, values: { email: raw.email ?? "" } };
  }
  return { ok: true, redirectTo: safeNext(raw.next) };
}

export async function signup(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = signupSchema.safeParse(raw);
  const keep = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("password")));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: keep };

  const { email, password, first_name, last_name, company_name } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name, last_name, company_name },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/tableau-de-bord`,
    },
  });
  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "Un compte existe déjà avec cette adresse e-mail."
        : error.code === "weak_password"
          ? "Mot de passe trop faible. Choisissez-en un plus long ou plus varié."
          : "Impossible de créer le compte. Veuillez réessayer.";
    return { message, values: keep };
  }
  if (!data.session) {
    return { ok: true, message: "Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse." };
  }
  return { ok: true, redirectTo: "/tableau-de-bord" };
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formToObject(formData);
  const parsed = resetRequestSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: raw };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });
  // Same answer whether or not the account exists (no account enumeration).
  return { ok: true, message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "Lien expiré. Veuillez refaire une demande de réinitialisation." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      message: error.code === "same_password" ? "Le nouveau mot de passe doit être différent de l'ancien." : "Impossible de modifier le mot de passe.",
    };
  }
  return { ok: true, redirectTo: "/tableau-de-bord?motdepasse=ok" };
}
