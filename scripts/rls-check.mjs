// Verifies tenant isolation directly against Supabase (bypassing the Next.js app).
// Usage: start the local stack (npx supabase start), then `node scripts/rls-check.mjs`.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); if (!ok) failed++; };

async function user(tag) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } });
  const email = `rls.${tag}.${Date.now()}@example.ch`;
  const { error } = await c.auth.signUp({ email, password: "Chantier2026!", options: { data: { company_name: `Entreprise ${tag}` } } });
  if (error) throw error;
  const { data: m } = await c.from("company_members").select("company_id").single();
  return { c, companyId: m.company_id };
}

const A = await user("a");
const B = await user("b");
const anon = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: cust } = await A.c.from("customers").insert({ company_id: A.companyId, first_name: "Marie", last_name: "Rochat" }).select().single();
const { data: inter } = await A.c.from("interventions").insert({ company_id: A.companyId, customer_id: cust.id, intervention_date: "2026-11-27", work_type: "Dépannage" }).select().single();
const path = `${A.companyId}/${inter.id}/test.jpg`;
const up = await A.c.storage.from("intervention-photos").upload(path, new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }));
check("A can upload into own folder", !up.error, up.error?.message);

for (const t of ["companies", "customers", "interventions", "intervention_photos", "quotes", "invoices", "subscriptions", "profiles", "company_members"]) {
  const { data } = await B.c.from(t).select("*");
  const leaked = (data ?? []).some((r) => r.company_id === A.companyId || r.id === A.companyId);
  check(`B cannot read A rows in ${t}`, !leaked);
}
const upd = await B.c.from("customers").update({ last_name: "Pirate" }).eq("id", cust.id).select();
check("B cannot update A customer", (upd.data ?? []).length === 0);
const del = await B.c.from("customers").delete().eq("id", cust.id).select();
check("B cannot delete A customer", (del.data ?? []).length === 0);
const ins = await B.c.from("customers").insert({ company_id: A.companyId, first_name: "X", last_name: "Y" });
check("B cannot insert into A company", !!ins.error, ins.error?.code);
const { data: bCust } = await B.c.from("customers").insert({ company_id: B.companyId, first_name: "Own", last_name: "Client" }).select().single();
const cross = await A.c.from("interventions").insert({ company_id: A.companyId, customer_id: bCust.id, intervention_date: "2026-11-27", work_type: "X" });
check("A cannot attach B's customer to an intervention", !!cross.error, cross.error?.code);
const compUpd = await B.c.from("companies").update({ name: "Hijack" }).eq("id", A.companyId).select();
check("B cannot rename A company", (compUpd.data ?? []).length === 0);
const dl = await B.c.storage.from("intervention-photos").download(path);
check("B cannot download A photo", !!dl.error);
const bup = await B.c.storage.from("intervention-photos").upload(`${A.companyId}/${inter.id}/evil.jpg`, new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
check("B cannot upload into A folder", !!bup.error);
const an = await anon.from("customers").select("*");
check("anonymous sees no customers", (an.data ?? []).length === 0);
const plans = await anon.from("plans").select("*");
check("anonymous can read the public plan catalogue", !plans.error);

console.log(failed ? `\n${failed} check(s) failed` : "\nAll RLS checks passed");
process.exit(failed ? 1 : 0);
