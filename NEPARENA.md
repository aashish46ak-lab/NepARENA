# NepARENA Development Guide

> **Production (`main` / efootballnepal.vercel.app) must NOT change until the owner types `Deploy Now`.**

All NepARENA work lives on branch **`neparena-dev`**.

## Environments

| Environment | Branch | URL |
|-------------|--------|-----|
| **Production** | `main` | https://efootballnepal.vercel.app |
| **Development** | `neparena-dev` | Vercel Preview (see below) |

### Get a permanent-ish preview URL

1. Open [Vercel Dashboard](https://vercel.com) → project **efootball-nepal**
2. **Settings → Git** → ensure GitHub repo is connected
3. Open **Deployments** → filter branch `neparena-dev`
4. Open the latest deployment → copy the **Preview URL**  
   Example shape: `https://efootball-nepal-git-neparena-dev-….vercel.app`
5. Optional: add a custom domain later, e.g. `preview.neparena.app` → point to this branch

Every push to `neparena-dev` rebuilds that preview. **Production stays on `main`.**

## Database (additive only)

File: `supabase-setup/11-neparena-organizers.sql`

Creates:
- `organizers`
- `organizer_members`
- `organizer_followers`
- `organizer_invitations`
- `tournaments.organizer_id` (nullable)
- Seeds **eFootball Nepal** as first organizer (`slug = efootball-nepal`)

**Do not run on production until Deploy Now** unless you accept additive schema on the live DB (safe, but optional until UI ships).

For local/preview testing: run the SQL in Supabase SQL editor against a **branch DB** if available, or the shared project only after backup.

## Super Admin

`aashish46ak@gmail.com` — platform super admin (see `src/lib/organizers.ts`).

## Roadmap (dev only)

1. [x] Branch `neparena-dev`
2. [x] Organizers schema (SQL)
3. [x] TypeScript helpers (`src/lib/organizers.ts`)
4. [ ] Platform shell + `/o/$slug` organizer public routes
5. [ ] Super Admin console (list/suspend/invite organizers)
6. [ ] Organizer invite accept flow
7. [ ] Follow organizers + home prioritization
8. [ ] Scope notifications / pending matches by followed organizers
9. [ ] Branding (NepARENA logo) on platform shell only
10. [ ] Deploy Now → merge to `main` with checklist

## Deploy Now checklist (when owner requests)

- [ ] Summary of files changed
- [ ] SQL already applied or apply `11-neparena-organizers.sql`
- [ ] No unfinished UI on public home unless gated
- [ ] Rollback: revert merge commit on `main` + Vercel rollback

## Branding note

NepARENA logo is for the **platform**. eFootball Nepal keeps its own logo as organizer branding until Deploy Now decides otherwise.
