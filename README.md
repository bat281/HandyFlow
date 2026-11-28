# HandyFlow

Administrative assistant for Swiss craftsmen (Suisse romande first). Phase 1 covers:
authentication, dashboard, customers, interventions (with photos), manual intervention
reports and server-side PDF export. French UI, CHF, DD.MM.YYYY, Swiss NPA validation.

Stack: Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · shadcn/ui-style
components (Radix) · Supabase (Postgres + Auth + Storage, RLS everywhere) · `@react-pdf/renderer` + `sharp` for PDFs.

## Run locally

Requirements: Node 20+, Docker (for the local Supabase stack).

```bash
npm install
npx supabase start          # local Postgres/Auth/Storage, applies supabase/migrations
cp .env.example .env.local   # then paste the local URL + publishable key printed by `npx supabase status`
npm run dev                  # http://localhost:3000
```

Auth e-mails (signup confirmation, password reset) are caught by Mailpit at http://127.0.0.1:54324.

Checks:

```bash
npm run lint && npx tsc --noEmit && npm run build
node scripts/rls-check.mjs   # tenant-isolation checks straight against Supabase (local stack)
```

## Connect a hosted Supabase project

1. Create a project (choose an EU region, e.g. Zurich/Frankfurt, for LPD/nLPD data-residency comfort).
2. `npx supabase link --project-ref <ref>` then `npx supabase db push` (creates tables, grants, RLS, buckets, plans). Newer projects do not grant table access to the API roles automatically; the `grants` migration handles it.
3. Auth > URL configuration: Site URL = your app URL; add `https://<your-domain>/**` to redirect URLs.
4. Auth > Providers > Email: keep "Confirm email" on in production.
5. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` in Vercel.
   No secret/service-role key is used by Phase 1.

## Phase 2 — AI voice reports

On the new/edit intervention form, **Dicter le rapport** records the craftsman (or imports a voice memo),
and the AI fills the report fields (work done, materials, time spent, recommendations, internal notes).
Nothing is saved until the craftsman reviews and clicks *Enregistrer*.

Flow: browser `MediaRecorder` (WebM on Android/Chrome, MP4 on iPhone) → private Storage bucket
`intervention-audio` (uploaded straight from the browser, so no Vercel body-size limit) → `POST /api/voice-report`
→ speech-to-text → Claude (structured JSON output) → fields filled client-side. The audio file is deleted
right after processing; the transcript is kept on the intervention (`voice_transcript`, never printed).

- Speech-to-text: Mistral Voxtral (`voxtral-mini-latest`, EU provider) by default, or OpenAI `gpt-4o-transcribe`
  if only `OPENAI_API_KEY` is set. Language forced to French.
- Report drafting: Claude (`claude-opus-5-5`, low effort, structured outputs, server-side refusal fallback).
- Cost guard: `ai_usage` table logs each run; `AI_MONTHLY_LIMIT` (default 200) caps runs per company per month.
  Plan gating (`voice_to_report` feature of the plan) arrives with subscriptions in Phase 4.
- Env vars: `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY` (or `OPENAI_API_KEY`). See `.env.example`.
- Database: migration `20261128000000_voice_reports.sql`.

## Structure

```
src/app/(auth)/        connexion, inscription, mot-de-passe-oublie + auth server actions
src/app/(app)/         tableau-de-bord, clients, interventions, parametres (protected)
src/app/api/interventions/[id]/pdf   server-side PDF (RLS-scoped, inline or ?download=1)
src/app/auth/          e-mail link handler (confirm) and POST sign-out
src/lib/               supabase clients, session, zod validation, formatting, i18n (fr.ts)
src/lib/pdf/           intervention report document
supabase/migrations/   schema, RLS policies, storage buckets, plan catalogue
```

## Data model and security

Tables: companies, profiles (users), company_members, customers, interventions,
intervention_photos, tax_rates, quotes, quote_items, invoices, invoice_items, plans, subscriptions.

- Every business row has `company_id`; RLS allows access only to members of that company
  (`is_company_member()`), so the model is ready for multi-employee companies (Business plan).
- Composite foreign keys `(id, company_id)` make it impossible to link a record to another company's customer/intervention.
- Signup creates the company, profile and owner membership in a database trigger.
- Storage buckets are private; the first path segment must be a company the user belongs to. Photos are shown via short-lived signed URLs.
- Report numbers (`RAP-YYYY-0001`) are assigned by the database when a report is marked as completed.
- Quotes/invoices tables, VAT rates and plans exist already, with no UI yet (Phases 3–4). Prices live in the `plans` table, not in code.

## Known limits / next steps

- Quotes, invoices, VAT settings and payment tracking: Phase 3. Dashboard tiles for them show 0 with a "bientôt" hint.
- i18n: navigation, statuses and validation messages are in `src/lib/i18n/fr.ts`; page copy is still inline French and should be moved there before adding German/Italian.
- iPhone HEIC photos: browsers usually convert to JPEG on upload; raw HEIC files are rejected.
- Nothing here has been reviewed for legal/accounting compliance (LPD, VAT, archiving) yet.
