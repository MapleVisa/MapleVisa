# 🍁 Maple Visa — Canadian Immigration Application Portal

A full-stack web application where applicants **sign up, choose a visa program, complete a
guided application, and submit it** for the team to **validate** and then hand to a
**licensed immigration lawyer** for processing.

Built from the field-by-field checklist in *"visa doc all information"* covering
Express Entry, Provincial Nominee, Family Sponsorship and Business / Start-Up Visa.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for a clean, professional UI
- **Prisma** ORM + **PostgreSQL** (Neon in production)
- **S3-compatible private storage** for documents (Supabase Storage free tier by
  default; R2/Backblaze/S3 by swapping env vars) — files are never public
- **JWT session auth** (`jose`) in httpOnly cookies + **bcrypt** password hashing
- **AI** via any OpenAI-compatible provider (Mistral by default) — multilingual form
  autofill, eligibility advisor, and vision-based document verification

## Getting started

```bash
cp .env.example .env   # then fill in DATABASE_URL, AUTH_SECRET, AI keys
npm install            # install deps (also generates Prisma client)
npx prisma db push     # create the tables in your PostgreSQL database
npm run db:seed        # seed demo accounts
npm run dev            # start on http://localhost:3000
```

You need a PostgreSQL database. The easiest free option is **Neon**: create a
project, then copy its connection string into `DATABASE_URL` (use the `-pooler`
host and keep `sslmode=require`).

> Run in **development** (`npm run dev`) locally. In production, session cookies are
> `secure` and require HTTPS.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Create a free **Neon** project → Connect → copy the connection string.
3. Create a **private bucket** on any S3-compatible store and its access keys. Free,
   no-card option: **Supabase Storage** (Project Settings → Storage → S3 connection).
4. From a local checkout pointed at the Neon DB, run `npx prisma db push` then
   `npm run db:seed` once to create tables + demo accounts.
5. On **vercel.com** → New Project → import the GitHub repo.
6. Add the environment variables from `.env.example` (Project → Settings → Environment
   Variables): `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`,
   `AI_MODEL`, `AI_VISION_MODEL`, `MAX_UPLOAD_MB`, `S3_ENDPOINT`, `S3_REGION`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, and (recommended)
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for rate limiting.
7. Deploy. Every push to the main branch redeploys automatically.

> 🔒 **Document storage is private.** With an S3-compatible store configured, uploaded
> documents live in a private bucket and are streamed only through the auth-checked
> `/api/documents/[id]` route — there are no public file URLs. The same code works with
> Supabase, R2, Backblaze, or AWS S3 (just change the env vars). If none is set, uploads
> fall back to Vercel Blob (public URLs — avoid for sensitive documents) or, in dev, the
> local `./uploads` folder.

### Demo accounts (created by the seed)

| Role        | Email                      | Password       | Lands on        |
| ----------- | -------------------------- | -------------- | --------------- |
| Applicant   | applicant@maplevisa.test   | applicant1234  | `/dashboard`    |
| Case officer| admin@maplevisa.test       | admin1234      | `/admin`        |
| Lawyer      | lawyer@maplevisa.test      | lawyer1234     | `/admin`        |

You can also create a brand-new applicant via **Sign up**.

## How it works

1. **Applicant** signs up → picks a visa program → fills a multi-step, **auto-saving**
   wizard tailored to that program → submits (required fields are validated first).
2. **Case officer (admin)** reviews the submission in the queue, can **request more
   info**, **validate**, or **reject**, then **assign it to a lawyer**.
3. **Lawyer** picks up validated cases, marks them **in processing**, and finally
   **approved**. Every change is recorded in the case **timeline** and reflected on the
   applicant's status tracker.

### Status pipeline

`DRAFT → SUBMITTED → UNDER_REVIEW → VALIDATED → WITH_LAWYER → IN_PROCESSING → APPROVED`
(plus `NEEDS_INFO` and `REJECTED` side states)

## The form engine

All program forms are **data-driven** from [`src/lib/programs.ts`](src/lib/programs.ts).
Each program is a list of `Section`s containing `Field`s (text, date, select, radio,
checkbox, textarea, and repeatable groups for things like education, jobs and children),
with simple conditional visibility (`showIf`). The UI renders any program from this data,
so adding a program or field requires **no UI changes** — just edit the schema.

Applicant answers are stored as a JSON blob on the `Application` record, mirroring the
"form engine" design suggested in the source document (Forms → Sections → Fields → Values).

## Project structure

```
prisma/
  schema.prisma          # User, Application, Document, ApplicationEvent, Conversation
  seed.mjs               # demo accounts
src/
  app/
    page.tsx             # marketing landing page
    login/ signup/       # auth pages
    dashboard/           # applicant: list of applications
    apply/               # program picker
    apply/[id]/          # wizard (editable) OR status tracker (submitted)
    admin/               # staff/lawyer review queue
    admin/[id]/          # case detail + actions
    api/                 # auth + application + admin REST endpoints
  components/            # UI components (wizard, fields, header, etc.)
  lib/
    programs.ts          # ← the visa form schemas (form engine)
    auth.ts  db.ts  status.ts  applications.ts
```

## Notes & next steps

This is a working foundation. Natural extensions:

- **Secure document uploads** (passport, ECA, language results) — the schema already
  tracks which documents an applicant can provide.
- Email notifications on status changes.
- Payment/retainer step before lawyer assignment.
- A proper `LAWYER` assignment UI (currently auto-assigns the first available lawyer).

> Demonstration project — not affiliated with IRCC. Field lists are derived from a
> general checklist and should be reviewed against current official IRCC requirements.
