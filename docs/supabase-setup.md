# Nom account and Supabase setup

Use the existing **Nom** project, ref **`iwamwxsosrhxsdcsuoiu`**, historically in `us-west-2`. The application allowlists `https://iwamwxsosrhxsdcsuoiu.supabase.co`. Before any remote write, authenticated project metadata must confirm this ref and name. Do not create another project or change LetterXO/other Crient projects.

On October 6, 2026, connected tooling verified this project and the existing Vercel `nom` project under **Leng's projects** (`prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`, team `team_ely71EC4Ov5TDqgbqA0ZSXBc`). The production domain is `nom-coral.vercel.app`. Migration `202610060001_nom_accounts.sql` is already applied and history matches. All seven account tables exist with RLS; actual ownership/isolation, persistence, Guest merge, account-only, cross-device, offline/retry/idempotency, and Experience replay checks passed. Disposable fixtures were cleaned up. Do not recreate the schema or replay that migration.

Both public Supabase variables are configured for Vercel Production, Preview, and Development. The server-only deletion credential is now configured as a Secret for Production only, verified through metadata without displaying its value; live handler behavior still requires deployment validation. The owner configured the production Site URL and callback/reset allowlist, enabled Google using the existing Web client, and added a controlled OAuth test user. Email/password and signup are enabled, confirmation is required, and anonymous signin is disabled. Default-mailer confirmation/reset delivery passed, including the owner's receipt observation. Custom SMTP is not configured.

The current production build is still commit `c7b834c`, which lacks both Auth handlers and `/api/account`. Both Auth paths fall back to Home in that older app. The completed working-tree foundation has not yet been committed/pushed/deployed. Hosted callback exchange, Google consent, recovery, session/hydration, and caller-only deletion remain **NOT YET DEPLOYED / BLOCKED**; email delivery PASS does not establish those flows. See [the current validation report](supabase-account-sync-validation/report.md) and [checkpoint inventory](supabase-account-sync-validation/checkpoint.md).

Two pre-existing advisor warnings on `public.rls_auto_enable()` were investigated. The fixed-search-path event-trigger helper is not defined by the Nom migration and no Nom account-data access path was found; its real REST invocation was rejected. It remains unchanged. This does not claim a zero-warning advisor signoff. References: [anonymous execute warning](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated execute warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Environment setup

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Local ignored env; intended Vercel environments | Existing Nom project's public URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same browser/build environments | Actual `sb_publishable_` key obtained securely from Nom |
| `SUPABASE_SECRET_KEY` | Server environment only | Caller-verified account deletion; never exposed through Vite |

For local development, put the two real public values into ignored `.env.local`, obtained from the verified Nom dashboard/authorized tooling. Configure the secret only if testing the deletion server with disposable accounts. Do not paste values into source files, docs, logs, command arguments, or commits. `.env.example` contains empty account placeholders. No real credential is included here.

Absent or invalid public configuration intentionally leaves Nom in full Guest Mode. A mismatched remote project, insecure remote URL, or privileged key supplied as the public key is rejected. Local Supabase URLs are accepted only in development; the server deletion endpoint deliberately targets the verified hosted Nom URL.

Never create `VITE_SUPABASE_SECRET_KEY`. Keep `GOOGLE_PLACES_API_KEY`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`, and `VITE_ENABLE_REWARD_QA` semantics unchanged. Do not raise Places quotas or make billable Places calls during automated validation.

## Already-applied database migration and future changes

The inspection/CLI commands below are reference procedures for future authorized changes. The existing migration is complete and needs no further application during the first account-system deployment.

Use an authenticated Supabase integration or CLI session. Confirm the project name/ref/status/region, list non-system application tables and schemas, check row counts without displaying user data, and inspect migration history before applying DDL. If unexpected application tables or data exist, stop DDL and report the discrepancy. Existing expected account tables also require migration-history/schema comparison; do not blindly rerun CREATE TABLE statements.

Useful read-only inspection queries:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
  and schemaname not like 'pg_toast%'
order by schemaname, tablename;

select to_regclass('supabase_migrations.schema_migrations');
-- Only if that relation exists:
select version, name from supabase_migrations.schema_migrations order by version;
```

Treat Supabase-managed Auth/Storage schemas separately from application schema. Record unexpected objects and inspect their ownership/history before any write. Record the real project identity independently; a SQL comment or hardcoded client URL is not remote verification.

The only application migration is:

`supabase/migrations/202610060001_nom_accounts.sql`

It creates seven account tables, ownership/cascades, keys/checks/indexes, three invoker functions with fixed search paths, triggers, RLS policies, and explicit grants. It has no destructive DROP behavior and intentionally does not create a dish catalog or image bucket. Version `202610060001` must be recorded by the chosen migration workflow when applied.

For an already authenticated CLI workflow, link only to the existing target, inspect history and preview pending changes:

```sh
supabase link --project-ref iwamwxsosrhxsdcsuoiu
supabase migration list
supabase db push --dry-run
```

If CLI requires local `config.toml`, create only its local CLI configuration; never create a remote project. Use secure CLI authentication/password storage rather than credential arguments. Only after target/schema/data/history inspection and review of the exact missing migration should the authorized operator run `supabase db push`. If the version is already applied, inspect schema drift instead of replaying it. These steps follow the [Supabase CLI migration workflow](https://supabase.com/docs/reference/cli/supabase-db-push).

After application, record migration version/results, all seven tables, constraints, indexes, RLS, policies, and grants. Run Security and Performance Advisors against Nom. Fix only issues caused by these migrations; leave unrelated managed objects alone.

## Executed SQL validation

Use an authorized isolated Supabase-compatible PostgreSQL database for fixture tests. It must provide `auth.users`, `auth.uid()`, and the `anon`/`authenticated` roles with actual PostgreSQL privilege/RLS behavior. Apply the migration there first. An SDK mock, SQLite database, or static SQL-string test is not an RLS execution result.

Configure an external secure PostgreSQL service named `nom-isolated` without credentials in this repository, then run:

```sh
PGSERVICE=nom-isolated psql -X -v ON_ERROR_STOP=1 -f supabase/tests/accounts_schema.sql
PGSERVICE=nom-isolated psql -X -v ON_ERROR_STOP=1 -f supabase/tests/accounts_rls.sql
```

`accounts_schema.sql` is read-only and checks the seven tables, owner cascades, exact keys, least-privilege grants, RLS, indexes, and invoker-function safety. `accounts_rls.sql` creates two synthetic users, exercises anonymous/User A/User B isolation for every table, mutable tombstones, newest-view RPC/direct upserts, immutable event retries, missing subject rejection, and deletion cascades while retaining User B. All fixtures/helpers are rolled back. Run as an authorized database owner capable of changing test roles, with `ON_ERROR_STOP`; do not disable RLS. Prefer an isolated test database over live production fixture insertion. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) explains how Auth ownership and role privileges interact.

## Email Auth and redirects

Email/password, signup, and required confirmation are already configured. Default-mailer confirmation and reset delivery passed; do not send more messages simply to repeat that result. A future hosted confirmation/recovery completion test needs a fresh disposable account and preserved initiating-browser PKCE storage, with cleanup after the callback test. Inspect Inbox/Spam manually; API 200 alone is not receipt evidence. The default mailer currently restricts recipients to project-team addresses and limits sends to two per hour; custom SMTP is a broader-launch hardening item, not configured by this work. [Supabase SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp)

The owner has set Site URL `https://nom-coral.vercel.app` and the two production URLs below. Local URLs are development requirements, not independently confirmed saved settings; inspect and obtain approval before adding missing entries:

```text
https://nom-coral.vercel.app/auth/callback
https://nom-coral.vercel.app/account/reset-password
http://localhost:5173/auth/callback
http://localhost:5173/account/reset-password
```

Add equivalent `127.0.0.1:5173` URLs only if that origin will actually be used. For Preview, allow the exact callback/reset URLs of verified, trusted Nom preview hosts. Do not guess a team slug or allow every Vercel host. Nom constructs redirects from `window.location.origin`; no Next.js-specific environment variable is required. See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).

Nom uses PKCE, a one-time callback exchange, and an allowlisted intended return. Confirmation and reset links must be opened in the browser that initiated them so its verifier is available. Keep email templates compatible with the configured redirect rather than hardcoding the production root. Reset flow: request on `/account`, open the email's `/account/reset-password?code=…` link, enter matching passwords of at least eight characters, update, then return to Account. Invalid/expired/provider-denied links show a safe error and offer a new attempt. See [Supabase password Auth](https://supabase.com/docs/guides/auth/passwords).

## Existing Google OAuth configuration

The owner has completed production Web-client creation, authorized production origin, Supabase callback registration, provider credentials/enablement, and OAuth test-user setup. Reuse this configuration; do not recreate or rotate it during validation unless a concrete problem requires a separately approved change. The original client secret was reportedly exposed in a setup screenshot: **rotate it as a separate production hardening action before broad release**, with explicit owner approval, then update only Nom's Supabase Google provider and retest OAuth. Never copy the old or new secret into source, chat, logs, screenshots, or Vite variables. The reference setup steps follow for troubleshooting/development:

1. Open the existing Nom Google Cloud project. Leave Places/Maps keys, restrictions, APIs, and quotas unchanged.
2. In Google Auth Platform, configure Branding/Audience and test users while testing; use only identity scopes (`openid`, email, profile).
3. Inspect the existing OAuth client of type **Web application**. Production origin is `https://nom-coral.vercel.app`; local development may also require `http://localhost:5173`. Add only verified Preview origins, and only after approval.
4. Set its authorized redirect URI to **`https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback`**, after confirming that URL on Nom's Google provider page.
5. In Nom Supabase Authentication → Google provider, enable Google and securely enter that client's ID and secret. Save. The secret belongs in Supabase's provider configuration, never in browser/Vite variables.
6. Verify the application callback/reset allowlist above. Test Continue with Google on localhost and the intended trusted deployment, including cancellation and safe return.
7. Complete Google audience/verification requirements before broader launch if applicable.

The Google provider redirect points to Supabase; Nom's application callback is `/auth/callback`. These are separate hops. Setup follows [Supabase Google Auth instructions](https://supabase.com/docs/guides/auth/social-login/auth-google). No direct Google-token integration, avatar-upload bucket, or Google password storage is used.

## Vercel configuration and approval boundaries

The two public variables were already created with explicit owner approval and verified for all three scopes. Leave their values and unrelated Google variables unchanged. Connected Supabase tooling exposes the public URL/publishable keys but cannot retrieve modern secret keys; do not mine credentials or ask for a secret in chat.

Observed on October 6, 2026 (values were not displayed):

| Variable | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Present | Present | Present |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Present | Present | Present |
| `SUPABASE_SECRET_KEY` | Present (Secret) | Missing | Missing |
| `GOOGLE_PLACES_API_KEY` | Present | Present | Missing |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Present | Present | Missing |
| `VITE_GOOGLE_MAPS_MAP_ID` | Present | Present | Missing |
| `VITE_ENABLE_REWARD_QA` | Missing | Present | Missing |

The existing ignored `.env.local` contains only the pre-existing Google variables; local account development requires adding the two public Supabase values securely or injecting them into the dev process. Vercel Development settings do not automatically populate a local file. Keep real env files untracked; `.env.example` contains placeholders only.

To resolve the deletion credential blocker, open [Nom Supabase API Keys](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/settings/api-keys), use an **existing modern Secret key beginning `sb_secret_`**, and copy it directly into [Nom Vercel Environment Variables](https://vercel.com/lengs-projects-0ab9a61c/nom/settings/environment-variables) as **`SUPABASE_SECRET_KEY`**, type **Secret**, **Production only**. Do not choose an anon/publishable key or legacy `service_role` JWT; the handler deliberately requires the modern secret-key format. Do not create/rotate a key without separate approval. Do not paste it into chat. Saving the variable does not deploy the app.

Vercel is connected to GitHub `Crient/nom`. The owner has confirmed Production Branch **main**: every main push automatically creates a Production deployment; other unassigned branches create Preview deployments. The owner explicitly approved the prepared checkpoint commit and main push with that Production effect. Future pushes require their own session authorization; do not treat a push as a harmless publication step. [Vercel Git deployments](https://vercel.com/docs/git)

Commit only after owner approval of the explicit checkpoint manifest. Request approval immediately before a push that can deploy Production; otherwise request separate deployment approval. Do not use `npm run ship` without that combined authorization: its non-dry-run mode commits and pushes `origin/main`. Vite embeds public variables at build time; existing deployments do not inherit saved settings. [Vercel environment scopes](https://vercel.com/docs/environment-variables)

## Account data and conflict rules

Guest data lives under `nom.v2.guest.*`; legacy `nom.v1.*` bytes are copied once without deletion. Accounts use `nom.v2.user.<UUID>.cache` and its `.outbox.*` backing records. Supabase sessions use a separate SDK namespace; Google provider tokens are stripped. Auth readiness and keyed provider boundaries prevent identity leakage.

Guest import is explicit. **Merge & Sync** unions active dish/restaurant favorites, keeps each dish's newest view, deduplicates meals by original ID and openings by box ID, preserves original reward choices, and accepts collectible favorites only after legitimate replay unlocks them. Meaningful cloud names take precedence over approved Guest names, provider metadata, and Explorer. **Use account data only** leaves Guest bytes intact and uploads none of them. Signout restores Guest.

Mutable favorites use tombstones: the last server-accepted mutation wins, regardless of device clock. Recent views use greatest timestamp. Completed meals and openings are immutable/idempotent. Event replay uses the existing reducer and recorded `local_day`; it does not recompute historical days in another timezone. Demo-seed/QA state and Places payloads never enter cloud mutations. Discovery answers stay identity-local. Unfinished drafts remain transient in the active local flow; the existing event serializer does not retain them across reload.

Account actions update locally first, then drain the durable outbox. Independent operation records protect concurrent stores; receipts prevent stale requeue after acknowledgement. Browser Web Locks coordinate cross-tab drains, with a same-realm fallback. Storage failures show an error and retain pending work in memory. Acknowledgement receipts remain until account cache deletion. Retry happens on boot/reconnect/focus/manual request and uses bounded backoff. Discovery/draft-only edits do not trigger cloud reads when no operation is pending. Profile/Account show saved-local, syncing, synced, offline, and retry states.

## Guest, merge, offline, and cross-device QA

Use disposable development accounts and avoid automated real Places calls.

1. With no account config, verify Guest Discovery, favorites, history, meal/feedback, progress, boxes, and collections. Confirm Home's four actions and neutral fresh name.
2. On Device A, create representative Guest data: dish/restaurant favorite, recent view, custom name, completed verified meal/feedback, valid opened box/collectible favorite. Sign in. Confirm nothing uploads until consent.
3. Choose **Merge & Sync**; wait for Synced. Inspect owned cloud rows once each, original IDs/local_day/feedback/reward choice, and equivalent logical Experience. Retry/reload; confirm no extra credit/events and preserved Guest bytes.
4. Separately choose **Use account data only** on an existing account. Verify cloud data, no Guest upload, and Guest restoration after signout.
5. Exercise G → A → G → B → G, including Discovery state. Check Profile/name/favorites/history/collections for leakage.
6. On Device B with fresh browser storage, sign into the same account and compare profile/favorites/views/meals/progress/collections. Mutate Device A again, then Refresh account data/reload Device B; confirm reconciliation and tombstones.
7. Offline on an authenticated device, favorite/log a supported event. Confirm optimistic UI, durable queue, and reload survival. Reconnect/Retry, inspect one accepted event per ID, acknowledgement, and consistent reload. Repeat with two concurrent tabs and an in-flight unfavorite.
8. Upload an older pending view over a newer cloud view; verify it remains newer. Retry meals/openings; preserve idempotency.
9. In QA builds, exercise `/dev/rewards` and `/dev/experience`; verify no changes to real Guest/account caches or cloud/outbox and no Places requests.

## Account deletion and launch readiness

The browser probes `/api/account`; deletion stays disabled until the server reports configuration. The UI requires typing DELETE. It obtains the current user's token and sends DELETE; the server validates it with Supabase, resolves the caller, and deletes only that Auth user using the server-only secret. A successful response must explicitly confirm `deleted: true` before local cleanup. Cascades remove owned rows. Sync stops, only that identity's cache/outbox/recovery records are cleared, and forced local signout restores Guest. Failed/unconfirmed deletion preserves account data and session.

Before public account launch, securely configure the server secret and test actual caller-only deletion/cascades with disposable accounts, including denied/expired requests and Guest/other-account preservation. Server-handler/UI mocks alone do not establish live deletion readiness.

## Validation and future work

Run one final pre-commit pass of `npm test`, `npm run build`, `npm run catalog:check`, `npm ls --depth=0`, `npm audit --json`, `node scripts/validate-account-secrets.mjs --dist`, `npm run ship -- --dry-run`, and `git diff --check` after necessary local fixes. Build already runs catalog validation and source/bundle credential checks. Do not repeat the already-passing live seven-table fixture suite absent a material persistence/RLS change. A packaging preview is not a commit or deployment.

After the approved account build reaches `nom-coral.vercel.app`, focus on previously unproven hosted behavior: app/Guest discovery, handled callback/reset paths, Google consent, email signin, confirmation/recovery completion using at most the necessary emails, reload/session restoration/signout, real account hydration and focused device sync, and protected `/api/account` deletion of a disposable user only. Inspect browser bundles for privileged values, console/network/Auth failures, and fixture cleanup. Preserve the initiating browser's PKCE storage through each callback; keep fixtures until all dependent flow checks finish. Do not delete the owner's personal account. Record PASS/FAIL/BLOCKED separately from NOT YET DEPLOYED; no hosted PASS can be assigned from local mocks or the old wildcard Home fallback.

Current Craving means the current Discovery session. A future Taste Profile could use feedback reactions, repeated meals, favorites, and exploration with explicit product/data contracts. This phase does not learn preferences, upload Discovery as lasting taste, or change ranking from account history.
