-- Pricing catalogue (data, not code): adjust prices/features here or from an admin tool.
-- Stripe price ids are filled in Phase 4.
insert into public.plans (id, name, price_monthly, currency, sort_order, features) values
  ('starter',  'Starter',  29, 'CHF', 1, '{"customers_limit": 100, "ai_reports_per_month": 10, "voice_to_report": false, "quotes_invoices": false, "photos": false, "seats": 1}'),
  ('pro',      'Pro',      49, 'CHF', 2, '{"customers_limit": null, "ai_reports_per_month": null, "voice_to_report": true, "quotes_invoices": true, "photos": true, "seats": 1}'),
  ('business', 'Business', 79, 'CHF', 3, '{"customers_limit": null, "ai_reports_per_month": null, "voice_to_report": true, "quotes_invoices": true, "photos": true, "seats": 10, "shared_customers": true}')
on conflict (id) do nothing;
