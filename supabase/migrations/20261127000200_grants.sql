-- Explicit API grants. Newer Supabase projects no longer grant the anon/authenticated
-- roles access to new tables in "public" automatically. Without these, every query
-- from the app fails with "permission denied" even though RLS policies exist.
-- Row Level Security still decides WHICH rows each user can see.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.customers, public.interventions, public.intervention_photos, public.tax_rates,
  public.quotes, public.quote_items, public.invoices, public.invoice_items
to authenticated;

grant select, update on public.companies, public.profiles to authenticated;
grant select on public.company_members, public.subscriptions to authenticated;
grant select on public.plans to anon, authenticated;

grant execute on function public.is_company_member(uuid), public.is_company_admin(uuid) to authenticated;
