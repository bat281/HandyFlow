-- HandyFlow — initial schema (Phase 1 + tables reserved for later phases)
-- Every business row carries a company_id. Access is granted through
-- company_members, so a user only ever sees rows of companies they belong to.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  legal_form text,
  address_line text,
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{4}$'),
  city text,
  country text not null default 'CH',
  phone text,
  email text,
  website text,
  vat_number text,               -- e.g. CHE-123.456.789 TVA
  iban text,
  logo_path text,                -- path inside the "company-assets" bucket
  default_hourly_rate numeric(10,2) check (default_hourly_rate is null or default_hourly_rate >= 0),
  default_payment_terms_days integer not null default 30 check (default_payment_terms_days between 0 and 365),
  currency text not null default 'CHF',
  locale text not null default 'fr-CH',
  -- Document numbering (used from Phase 3)
  quote_prefix text not null default 'DEV-',
  quote_next_number integer not null default 1,
  invoice_prefix text not null default 'FAC-',
  invoice_next_number integer not null default 1,
  report_prefix text not null default 'RAP-',
  report_next_number integer not null default 1,
  -- Document appearance
  document_accent_color text not null default '#1e3a8a' check (document_accent_color ~ '^#[0-9a-fA-F]{6}$'),
  document_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Users (profiles) and membership
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  locale text not null default 'fr-CH',
  current_company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create type public.member_role as enum ('owner', 'admin', 'member');

create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members(user_id);

-- Security-definer helpers so RLS policies don't recurse into company_members.
create or replace function public.is_company_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.is_company_admin(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  company_name text,
  email text,
  phone text,
  address_line text,
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{4}$'),
  city text,
  country text not null default 'CH',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id)
);
create index customers_company_idx on public.customers(company_id, last_name);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Interventions
-- ---------------------------------------------------------------------------
create type public.intervention_status as enum ('draft', 'completed');

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  intervention_date date not null,
  location_address text,
  location_postal_code text check (location_postal_code is null or location_postal_code ~ '^[0-9]{4}$'),
  location_city text,
  work_type text not null check (char_length(work_type) between 1 and 120),
  description text,               -- work performed (main body of the report)
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 0 and 100000),
  observations text,              -- remarks / recommendations shown on the report
  notes text,                     -- internal notes (not printed)
  status public.intervention_status not null default 'draft',
  report_number text,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  -- composite FK: a customer of another company can never be attached
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete restrict
);
create index interventions_company_date_idx on public.interventions(company_id, intervention_date desc);
create index interventions_customer_idx on public.interventions(customer_id);
create trigger interventions_updated_at before update on public.interventions
  for each row execute function public.set_updated_at();

create table public.intervention_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  intervention_id uuid not null,
  storage_path text not null unique,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (intervention_id, company_id) references public.interventions(id, company_id) on delete cascade
);
create index intervention_photos_intervention_idx on public.intervention_photos(intervention_id, position);

-- ---------------------------------------------------------------------------
-- VAT rates (configurable, never hardcoded in business logic)
-- ---------------------------------------------------------------------------
create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  rate numeric(5,2) not null check (rate >= 0 and rate < 100),
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tax_rates_company_idx on public.tax_rates(company_id);

-- ---------------------------------------------------------------------------
-- Quotes & invoices (UI arrives in Phase 3; schema is ready now)
-- ---------------------------------------------------------------------------
create type public.quote_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  intervention_id uuid references public.interventions(id) on delete set null,
  number text,
  status public.quote_status not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  currency text not null default 'CHF',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, number),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete restrict
);
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null,
  position integer not null default 0,
  kind text not null default 'service' check (kind in ('service', 'material', 'labour')),
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text,
  unit_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  foreign key (quote_id, company_id) references public.quotes(id, company_id) on delete cascade
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null,
  quote_id uuid references public.quotes(id) on delete set null,
  intervention_id uuid references public.interventions(id) on delete set null,
  number text,
  status public.invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  paid_at timestamptz,
  currency text not null default 'CHF',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, number),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete restrict
);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null,
  position integer not null default 0,
  kind text not null default 'service' check (kind in ('service', 'material', 'labour')),
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text,
  unit_price numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  foreign key (invoice_id, company_id) references public.invoices(id, company_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Plans & subscriptions (Phase 4). Plans are data, so pricing is configurable.
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key,                     -- 'starter' | 'pro' | 'business'
  name text not null,
  price_monthly numeric(10,2) not null,
  currency text not null default 'CHF',
  features jsonb not null default '{}'::jsonb,
  stripe_price_id text,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_id text references public.plans(id),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Report numbering: assigned when a report is marked completed
-- ---------------------------------------------------------------------------
create or replace function public.assign_report_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n integer;
  p text;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at = coalesce(new.completed_at, now());
    if new.report_number is null then
      update public.companies
        set report_next_number = report_next_number + 1
        where id = new.company_id
        returning report_next_number - 1, report_prefix into n, p;
      new.report_number = p || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
    end if;
  end if;
  return new;
end;
$$;
create trigger interventions_report_number before update on public.interventions
  for each row execute function public.assign_report_number();

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + company + owner membership
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  cname text;
begin
  cname := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Mon entreprise');
  insert into public.companies (name, email) values (left(cname, 200), new.email) returning id into cid;
  insert into public.profiles (id, first_name, last_name, current_company_id)
    values (
      new.id,
      nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
      cid
    );
  insert into public.company_members (company_id, user_id, role) values (cid, new.id, 'owner');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.customers enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_photos enable row level security;
alter table public.tax_rates enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

-- companies: members read, admins update. Creation happens via the signup trigger.
create policy companies_select on public.companies for select to authenticated
  using (public.is_company_member(id));
create policy companies_update on public.companies for update to authenticated
  using (public.is_company_admin(id)) with check (public.is_company_admin(id));

-- profiles: a user manages only their own profile
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (current_company_id is null or public.is_company_member(current_company_id)));

-- company_members: members can see who is in their company; changes go through admin tooling later
create policy company_members_select on public.company_members for select to authenticated
  using (public.is_company_member(company_id));

-- Company-scoped business tables: full CRUD for members of the company.
do $$
declare t text;
begin
  foreach t in array array['customers','interventions','intervention_photos','tax_rates',
                           'quotes','quote_items','invoices','invoice_items']
  loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.is_company_member(company_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_company_member(company_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_company_member(company_id))', t);
  end loop;
end $$;

-- plans: public catalogue (pricing page). subscriptions: read-only for members;
-- writes come from the Stripe webhook using the service role (Phase 4).
create policy plans_select on public.plans for select to anon, authenticated using (active);
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- Storage buckets (private) — first path segment must be the company id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('intervention-photos', 'intervention-photos', false, 10485760,
    array['image/jpeg','image/png','image/webp']),
  ('company-assets', 'company-assets', false, 2097152,
    array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy storage_company_select on storage.objects for select to authenticated
  using (bucket_id in ('intervention-photos','company-assets')
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy storage_company_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('intervention-photos','company-assets')
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy storage_company_update on storage.objects for update to authenticated
  using (bucket_id in ('intervention-photos','company-assets')
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy storage_company_delete on storage.objects for delete to authenticated
  using (bucket_id in ('intervention-photos','company-assets')
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
