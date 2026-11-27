import { z } from "zod";
import { t } from "./i18n";

const v = t.validation;

/** Trim; empty string -> null. */
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, v.tooLong)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional()
    .transform((s) => s ?? null);

const requiredText = (max = 200) => z.string({ error: v.required }).trim().min(1, v.required).max(max, v.tooLong);

export const swissPostalCode = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional()
  .transform((s) => s ?? null)
  .refine((s) => s === null || (/^\d{4}$/.test(s) && Number(s) >= 1000 && Number(s) <= 9699), v.postalCode);

export const phone = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional()
  .transform((s) => s ?? null)
  .refine((s) => s === null || /^\+?[0-9 ().-]{7,20}$/.test(s), v.phone);

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((s) => (s === "" ? null : s))
  .nullable()
  .optional()
  .transform((s) => s ?? null)
  .refine((s) => s === null || z.email().safeParse(s).success, v.email);

export const customerSchema = z.object({
  first_name: requiredText(100),
  last_name: requiredText(100),
  company_name: optionalText(200),
  email: optionalEmail,
  phone,
  address_line: optionalText(200),
  postal_code: swissPostalCode,
  city: optionalText(100),
  notes: optionalText(5000),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const materialSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.number().min(0).max(1_000_000).nullable(),
  unit: z.string().trim().max(20).nullable(),
});

export const interventionSchema = z.object({
  customer_id: z.uuid({ error: "Veuillez choisir un client" }),
  intervention_date: z.iso.date({ error: v.date }),
  location_address: optionalText(200),
  location_postal_code: swissPostalCode,
  location_city: optionalText(100),
  work_type: requiredText(120),
  description: optionalText(20000),
  observations: optionalText(10000),
  notes: optionalText(10000),
  duration_hours: z.coerce.number({ error: v.number }).int().min(0).max(999).default(0),
  duration_mins: z.coerce.number({ error: v.number }).int().min(0).max(59).default(0),
  materials: z.array(materialSchema).max(200),
});
export type InterventionInput = z.infer<typeof interventionSchema>;

export const companySchema = z.object({
  name: requiredText(200),
  address_line: optionalText(200),
  postal_code: swissPostalCode,
  city: optionalText(100),
  phone,
  email: optionalEmail,
  website: optionalText(200),
  vat_number: optionalText(40).refine(
    (s) => s === null || /^CHE[-\s]?\d{3}\.?\d{3}\.?\d{3}(\s?(TVA|MWST|IVA))?$/i.test(s),
    "Format attendu : CHE-123.456.789 TVA",
  ),
  iban: optionalText(42).refine(
    (s) => s === null || /^CH\d{2}\s?([0-9A-Z]{4}\s?){4}[0-9A-Z]$/i.test(s.replace(/\s+/g, " ").trim()),
    "IBAN suisse attendu (ex. CH93 0076 2011 6238 5295 7)",
  ),
  default_hourly_rate: z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s.replace(",", "."))))
    .refine((n) => n === null || (!Number.isNaN(n) && n >= 0 && n <= 10000), v.number),
  default_payment_terms_days: z.coerce.number({ error: v.number }).int().min(0).max(365),
  document_accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue"),
  document_footer: optionalText(500),
});

export const profileSchema = z.object({
  first_name: optionalText(100),
  last_name: optionalText(100),
  phone,
});

export const signupSchema = z
  .object({
    first_name: requiredText(100),
    last_name: requiredText(100),
    company_name: requiredText(200),
    email: z.string().trim().toLowerCase().pipe(z.email({ error: v.email })),
    password: z.string().min(8, v.passwordMin).max(72),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, { message: v.passwordMatch, path: ["password_confirm"] });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: v.email })),
  password: z.string().min(1, v.required),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: v.email })),
});

export const newPasswordSchema = z
  .object({ password: z.string().min(8, v.passwordMin).max(72), password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, { message: v.passwordMatch, path: ["password_confirm"] });

/** FormData -> plain object of strings. */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of fd.entries()) if (typeof val === "string") out[k] = val;
  return out;
}

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}
