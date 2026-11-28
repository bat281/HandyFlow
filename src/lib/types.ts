export type Material = { name: string; quantity: number | null; unit: string | null };

export type Company = {
  id: string;
  name: string;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_number: string | null;
  iban: string | null;
  logo_path: string | null;
  default_hourly_rate: number | null;
  default_payment_terms_days: number;
  document_accent_color: string;
  document_footer: string | null;
};

export type Profile = { id: string; first_name: string | null; last_name: string | null; phone: string | null; current_company_id: string | null };

export type Customer = {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InterventionStatus = "draft" | "completed";

export type Intervention = {
  id: string;
  company_id: string;
  customer_id: string;
  intervention_date: string;
  location_address: string | null;
  location_postal_code: string | null;
  location_city: string | null;
  work_type: string;
  description: string | null;
  materials: Material[];
  duration_minutes: number | null;
  observations: string | null;
  notes: string | null;
  voice_transcript: string | null;
  status: InterventionStatus;
  report_number: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterventionPhoto = { id: string; intervention_id: string; storage_path: string; caption: string | null; position: number };

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  /** Client-side navigation target after a successful save. */
  redirectTo?: string;
};
