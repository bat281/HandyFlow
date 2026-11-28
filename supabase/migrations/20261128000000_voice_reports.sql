-- Phase 2 — AI voice reports
-- 1. A private bucket for short voice recordings (deleted right after transcription).
-- 2. The transcript is kept on the intervention (internal, never printed).
-- 3. An AI usage log, used to cap how many AI reports a company can run per month.

-- ---------------------------------------------------------------------------
-- Transcript on the intervention
-- ---------------------------------------------------------------------------
alter table public.interventions
  add column if not exists voice_transcript text
  check (voice_transcript is null or char_length(voice_transcript) <= 50000);

-- ---------------------------------------------------------------------------
-- Audio bucket (private). First path segment must be the company id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('intervention-audio', 'intervention-audio', false, 26214400,
    array['audio/webm','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/mpeg','audio/ogg','audio/wav','audio/x-wav'])
on conflict (id) do nothing;

drop policy if exists storage_audio_select on storage.objects;
drop policy if exists storage_audio_insert on storage.objects;
drop policy if exists storage_audio_delete on storage.objects;

create policy storage_audio_select on storage.objects for select to authenticated
  using (bucket_id = 'intervention-audio'
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy storage_audio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'intervention-audio'
         and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy storage_audio_delete on storage.objects for delete to authenticated
  using (bucket_id = 'intervention-audio'
         and public.is_company_member(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------------
-- AI usage log (one row per AI report generated)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'voice_report' check (kind in ('voice_report')),
  audio_seconds numeric(10,1),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_company_month_idx on public.ai_usage(company_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_select on public.ai_usage;
drop policy if exists ai_usage_insert on public.ai_usage;
create policy ai_usage_select on public.ai_usage for select to authenticated
  using (public.is_company_member(company_id));
-- Rows are written by the server route with the user's own session; no update/delete.
create policy ai_usage_insert on public.ai_usage for insert to authenticated
  with check (public.is_company_member(company_id) and user_id = auth.uid());

grant select, insert on public.ai_usage to authenticated;
