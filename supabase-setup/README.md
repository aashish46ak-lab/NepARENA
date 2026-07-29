# eFootball Nepal — Supabase setup

Run these files in order in your Supabase SQL editor:

1. `01-schema.sql` — tables, enums, helper functions, GRANTs
2. `02-rls.sql` — Row Level Security policies
3. `03-triggers.sql` — auto-create profile + grant Owner to aashish46ak@gmail.com
4. `04-storage.sql` — public `efn-public` bucket + policies
5. `05-seed.sql` — starter content

## After running

- Auth → Providers → Email: enable **Email OTP** (length 6, expiry 600s). Magic links are not used.
- Vercel env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- To promote a moderator: sign in as Owner → Admin dashboard → Users & roles → Make mod.
