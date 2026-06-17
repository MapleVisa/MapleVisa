# 🍁 Maple Visa — Canadian Immigration Application Portal

A full-stack web application where applicants **sign up, choose a visa program, complete a
guided application, and submit it** for the team to **validate** and then hand to a
**licensed immigration lawyer** for processing.

Built from the field-by-field checklist in *"visa doc all information"* covering
Express Entry, Provincial Nominee, Family Sponsorship and Business / Start-Up Visa.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for a clean, professional UI
- **Prisma** ORM + **MySQL** (TiDB Cloud Serverless in production)
- **JWT session auth** (`jose`) in httpOnly cookies + **bcrypt** password hashing
- **AI** via any OpenAI-compatible provider (Mistral by default) — multilingual form
  autofill, eligibility advisor, and vision-based document verification

## Getting started

```bash
cp .env.example .env   # then fill in DATABASE_URL, AUTH_SECRET, AI keys
npm install            # install deps (also generates Prisma client)
npx prisma db push     # create the tables in your MySQL/TiDB database
npm run db:seed        # seed demo accounts
npm run dev            # start on http://localhost:3000
```

You need a MySQL database. The easiest free option is **TiDB Cloud Serverless**
(MySQL-compatible): create a cluster, then copy its **Prisma** connection string into
`DATABASE_URL`.

> Run in **development** (`npm run dev`) locally. In production, session cookies are
> `secure` and require HTTPS.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Create a free **TiDB Cloud Serverless** cluster → Connect → copy the **Prisma**
   connection string.
3. From a local checkout pointed at that DB, run `npx prisma db push` then
   `npm run db:seed` once to create tables + demo accounts.
4. On **vercel.com** → New Project → import the GitHub repo.
5. Add the environment variables from `.env.example` (Project → Settings → Environment
   Variables): `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`,
   `AI_MODEL`, `AI_VISION_MODEL`, `MAX_UPLOAD_MB`.
6. Deploy. Every push to the main branch redeploys automatically.

> ⚠️ **File uploads on Vercel:** the document upload currently writes to local disk
> (`/uploads`), which does **not** persist on Vercel's serverless filesystem. Switch to
> blob storage (e.g. Vercel Blob or an S3-compatible bucket) before relying on uploads in
> production. Everything else (auth, forms, AI, withdraw) works on Vercel as-is.

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
