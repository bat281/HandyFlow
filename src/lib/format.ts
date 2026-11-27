import { DEFAULT_LOCALE } from "./i18n";

/** DD.MM.YYYY — accepts ISO date (YYYY-MM-DD) or full timestamps. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  let d: Date;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split("-").map(Number);
    d = new Date(Date.UTC(y, m - 1, day));
  } else {
    d = new Date(value);
  }
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(d);
}

/** Amounts in CHF, Swiss grouping (1'234.50). */
export function formatCHF(amount: number | null | undefined, currency = "CHF"): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("de-CH", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function fullName(p: { first_name?: string | null; last_name?: string | null }): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
}

/** Swiss address block, e.g. "Rue du Lac 12, 1003 Lausanne". */
export function formatAddress(a: { address_line?: string | null; postal_code?: string | null; city?: string | null }): string {
  const locality = [a.postal_code, a.city].filter(Boolean).join(" ");
  return [a.address_line, locality].filter(Boolean).join(", ");
}

/** Today's date in Switzerland as YYYY-MM-DD. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
}
