# Nom — free migration preview

Branch `hosting/free-cloudflare-preview-20261026` preserves deployed baseline `da65f5f892d808d3ec981cba1e3d2cb214c496ce`. The React application, 201-dish catalog and database schema are preserved. Two server modules import the same catalog JSON instead of reading the local filesystem, so Workers can bundle it.

`npm ci --ignore-scripts`, `npm test`, `npm run check:cloudflare`, then `npm run build:cloudflare`. All 84 Vitest suites / 1,360 tests and the three adapter checks pass. The existing build validates catalog data and browser/server credential separation.

Pages project: `leng-nom-preview-20261026`. Preview: https://migration-20261026.leng-nom-preview-20261026.pages.dev . Reserved production branch: `owner-approved-production`; no production deployment. `CLOUDFLARE_ACCOUNT_ID=07f48608f6c0c2e51553c6f0d53418ea node cloudflare/deploy-preview.mjs` always uses preview branch `migration-20261026`. Existing Vercel deployment and domain are preserved; this migration branch is disabled in Vercel's Git integration.

Only `/api/*` invokes Pages Functions. The adapter retains the existing five endpoints, method/body validation, cookies, duplicate query parameters, abort handling and Cloudflare's trusted client IP. Frontend files use free static hosting. No R2, KV, database or paid Workers subscription is created. Free Functions limits can reject work; they do not authorize an upgrade.

The original Supabase project `iwamwxsosrhxsdcsuoiu` was paused. It was restored on its existing Free plan and now reports `ACTIVE_HEALTHY`; no schema or records were changed. Copying its existing server credential to this Preview is pending explicit owner approval after automatic approval review rejected the transfer. Never print/commit a secret. Use Preview-only Cloudflare secrets; do not change Vercel environment variables. Only public settings and the derived verification public key may enter the Vite build.

Hosted Chromium/WebKit checks complete the guest discovery flow, reload deep links and verify API routing. They block Supabase and Google browser requests and make no account/database writes. Authenticated account, deletion, rewards and live restaurant-provider flows are not certified. Google Places/OCR credentials have not been transferred; any paid-provider use must meet the owner's strict $0 budget. Existing provider redirect/referrer allowlists may need owner review for the new origin.

Limits: https://developers.cloudflare.com/pages/platform/limits/ and https://developers.cloudflare.com/workers/platform/limits/ . Supabase Free projects may pause after inactivity; do not add keepalive automation to evade that policy.
