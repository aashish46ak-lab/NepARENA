# NepARENA first-run brand refresh

## Build
- Generate compressed official-logo variants for UI, favicons, Apple touch, and PWA sizes, keeping the 192px icon under 50KB.
- Replace the football splash with a 1.2–1.5 second branded splash using the v9 session key.
- Replace the current welcome screens with one four-slide, mobile-first flow using only `neparena_welcome_v4`.
- Remove the old onboarding tour from the root flow and preserve a single splash → welcome → app sequence.
- Add a delayed, one-time install modal after welcome completion, using the existing browser install prompt and iOS instructions.
- Show the new UI logo on login, signup, verification, install controls, and all new first-run screens without changing authentication behavior.

## Technical details
- Keep TanStack Router, existing authentication calls, tournament code, navigation, and AdSense unchanged.
- Coordinate completion callbacks in the root so first-run overlays never overlap.
- Preserve the existing PWA manifest and guarded registration behavior; only update image references and install presentation.
- Validate image dimensions/file sizes, TypeScript, first-visit and returning-user flows, `/auth`, iOS fallback, mobile, and desktop.

## Testing keys
- `sessionStorage`: `neparena_splash_seen_v9`
- `localStorage`: `neparena_welcome_v4`, `neparena-install-dismissed-v2`
