# NepARENA phone push (Web Push)

## 1. SQL (Supabase SQL editor)

Run `supabase-setup/30-platform-posts-and-push.sql` if you have not already
(creates `push_subscriptions` + RLS).

Also run `supabase/verified_and_follow_fix.sql`.

## 2. Generate VAPID keys (once)

```bash
npx web-push generate-vapid-keys
```

Copy:

- **Public key** → Vercel / hosting env: `VITE_VAPID_PUBLIC_KEY=...`
- **Private key** → Supabase Edge Function secret only (never in client)

## 3. Deploy edge function

```bash
supabase functions deploy send-push --no-verify-jwt
supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:aashish46ak@gmail.com"
```

## 4. Client behaviour (already in code)

- On login → `subscribeWebPush(userId)` saves endpoint to `push_subscriptions`
- NotificationsBell also requests permission and subscribes
- Sending a DM → in-app notification + `send-push` edge invoke for peer phones
- `public/sw.js` shows the OS notification when the push arrives (even if app is closed)

## 5. Test on phone

1. Install PWA (Add to Home Screen) on Android Chrome (best support).
2. Sign in, allow notifications.
3. From another account send a DM.
4. Lock phone — notification should appear.

iOS Safari: requires iOS 16.4+ and installed PWA; grant notification permission from the home-screen app.
