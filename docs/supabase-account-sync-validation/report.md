# Nom Supabase/account live validation

## Production release authorization — October 6, 2026

The owner explicitly approved the prepared 84-file checkpoint commit, push to **main**, and the resulting automatic **Nom Production deployment**. The owner confirmed GitHub `Crient/nom`, Production Branch `main`, automatic Production deployment on every main push, automatic Preview deployments for other unassigned branches, and production domain `https://nom-coral.vercel.app`. This resolves the earlier Git-control inspection blocker. No additional deployment/project-setting mutation is authorized or needed.

Connected environment metadata, with decryption disabled and values withheld, confirms `SUPABASE_SECRET_KEY` is now **Secret/sensitive, Production only**, and the two public variables and existing Google/QA scopes remain configured. This resolves credential presence, not yet functional deletion validation.

Immediately before commit, all **84 files matched their recorded predeployment hashes**; branch/HEAD/index were unchanged. A lightweight candidate credential/artifact scan, source/emitted-bundle account scanner, env-placeholder check, and whitespace check passed. No actual env files, secret keys, OAuth credentials, screenshots, browser state, or `/private/tmp` scripts are selected. No full test/RLS audit was repeated because the validated source had not changed. Only documentation is updated with the newly confirmed authorization/configuration before committing. Full final baseline remains **971 tests PASS, build PASS, catalog 201 PASS, npm audit 0 vulnerabilities**.

Production-facing results will be added after the automatic deployment is monitored and validated. No hosted PASS is inferred from the owner's configuration confirmation. Google client-secret rotation remains a separate explicitly approved hardening action; no rotation was performed.

## Current production preparation — October 6, 2026 (checkpoint ready; dashboard/approval blocked)

This section is the current handoff. Earlier live validation is authoritative and was not replayed. **Local implementation/security/final validation PASS; account production build NOT YET DEPLOYED.** No application change was needed in this preparation. The setup guide was corrected to reflect the completed migration, public environments, configured Auth/Google, successful delivery, and actual deployment boundaries.

### Git and checkpoint scope

Branch **`main`**; HEAD **`c7b834ce27c17d7e9c1825f096c4cf350caab837`**. A read-only `git ls-remote origin refs/heads/main` returned the same commit. Origin is **`git@github.com:Crient/nom.git`**. No commit, push, or deployment was performed; the repository index remains unchanged/empty. No deleted paths were found.

Initial inventory: **45 tracked modified files**, **53 untracked files**, **0 staged**, **0 deleted**. The newly prepared `checkpoint.md` makes **54 untracked files** at handoff. Exact modified/new/excluded paths are in [the checkpoint manifest](checkpoint.md): **84 proposed files**, **15 intentionally excluded existing untracked files**. The only new file from this pass is that manifest; only the manifest, this report, and `docs/supabase-setup.md` were written in the repository during preparation.

Recommended single commit: **`feat: add Supabase accounts auth and cross-device sync`**. The candidate includes the existing integrated source/test changes, including already-present recommendation compatibility/session and Region-layout changes covered by the authoritative baseline. This preparation adds no ranking/personalization/UI/Places change. Separating these inherited runtime changes would create a different deployment candidate; the proposed checkpoint preserves the current tree. Unrelated audit documents and the empty generated-image placeholder are excluded and preserved. An explicit 84-path package preview used a disposable index; no real staging took place. Do not use non-dry-run `npm run ship` just to commit: it commits and pushes `origin/main`.

### Credential/artifact inspection

**PASS:** tracked/candidate text files contain no detected literal Google OAuth client secret (`GOCSPX-` format), Supabase secret key/service-role JWT/personal access token, private key, GitHub token, Google access token, or hardcoded Google API key. No real env file is tracked or staged; `.env.example` alone is tracked and contains only placeholders/empty values. Existing `.env.local` is ignored and contains names for the pre-existing Google variables only; values were not printed or copied. It was not edited. Server env references and synthetic test fixtures are legitimate, not credentials.

No candidate screenshot, browser state, HAR, trace archive, or generated dish image is included. `dist/`, `node_modules/`, local caches, ignored JSON/log/PNG/TXT validation evidence, and ignored image workspaces are excluded. No repository symlinks point outside the project. All `/private/tmp` validation scripts/artifacts are outside the Git root, so they cannot enter this explicit manifest. The opt-in repository live validator is retained as legitimate source; migration files, SQL tests, setup documentation, reports, account/Auth source, and automated tests are retained. Previously generated private email passwords/PKCE state and live disposable-user credentials were already removed. The three disposable inspection/manifest scripts created for this pass were removed after their sanitized evidence was saved; preview index/lock files were removed automatically. Existing external temporary evidence and the legitimate ignored build output were preserved rather than indiscriminately deleting earlier work.

The reported screenshot exposure of the **Google OAuth client secret** is a separate production-hardening item: rotate it with explicit owner approval and update only Nom's provider, then retest OAuth. No secret was retrieved, copied, printed, committed, or rotated here. Existing `rls_auto_enable()` helper and its investigated warnings remain unchanged.

### Required implementation coverage

| Required behavior | Implementation present / basis |
|---|---|
| Supabase client, PKCE, session restoration, provider-token stripping | `src/lib/supabaseClient.js`, `src/context/Auth.jsx`; exact Nom URL/public-key boundary, persisted SDK storage, readiness handling. |
| Email signup/signin, confirmation, Google initiation/callback, signout, reset request/UI | `src/pages/Account.jsx`, `AuthCallback.jsx`, `ResetPassword.jsx`, `src/utils/accountNavigation.js`, explicit routes and stable Auth callback boundary in `src/App.jsx`. |
| All seven cloud data types | `src/data/cloudRepository.js` and `cloudState.js`: profiles, dish/restaurant/collectible favorites, recent dish view RPC, meal logs, opened boxes; actual live persistence/RLS already PASS. |
| Guest/local mode, consented merge, account-only, identity storage, restoration | `src/context/LocalData.jsx`, `src/components/account/GuestMigration.jsx`, `src/data/identityStorage.js`, `syncEngine.js`; existing live Guest/identity checks PASS. |
| Offline outbox, locking/retry/idempotency, cross-device hydration | `src/data/accountOutbox.js`, `syncEngine.js`, `cloudRepository.js`; existing real backend and mounted-browser checks PASS. |
| Experience replay, original event/reward preservation | `src/data/persistedState.js`, `experienceState.js`, cloud serializers and account store; existing live replay checks PASS. |
| QA/demo isolation | Flag-gated `/dev/experience`, memory-only `ExperienceFlow`/preview scope, mutation source filters; mounted QA and Places-isolation checks already PASS. |
| Account deletion foundation | `api/account.js` → `server/accountHandler.js`; Node server import checked, caller verified with remote `auth.getUser(token)`, only resolved caller deleted, no supplied target accepted; server/client negative tests PASS. Hosted DELETE still BLOCKED. |

Catalog source/assets are unchanged relative to HEAD. The current 201-dish catalog, existing working-tree recommendation behavior, Guest mode, Places API behavior and QA flag scopes are preserved. No ML personalization was introduced. No schema/migration or Supabase data operation occurred in this preparation.

### Final requested validation (one pass)

| Check | Status | Result |
|---|---|---|
| Full automated suite | PASS | **971/971 tests, 58/58 files**; embedded Python suites **16 + 40** PASS. |
| Production build | PASS | Vite build succeeded; build-time catalog/source/emitted-bundle boundary checks passed. |
| 201-dish catalog | PASS | `catalog:check`: 201 unique records in workbook order; source/assets have no tracked diff. |
| Credential/artifact scan | PASS | Source/bundle account scanner, extended candidate/track inventory, placeholders and ignored env verified; values withheld. |
| Dependency tree / audit | PASS | `npm ls --depth=0` valid; locked installed versions unchanged; npm audit **0 vulnerabilities**. |
| Ship/package validation | PASS | `npm run ship -- --dry-run` and explicit 84-file checkpoint package preview; disposable indexes only, no commit/push/deploy. The broad ship preview may list extra historical reports; the explicit manifest controls the proposed commit. |
| Runner/server syntax/import and whitespace | PASS | Opt-in live runner parses; server endpoint imports without invoking a remote operation; `git diff --check` clean. |
| Existing live account/RLS/sync results | PASS | Accepted authoritative results; no expensive fixture suite, repeat emails, or Places requests issued. |

Sanitized final logs: `/private/tmp/nom-predeploy-tests.log`, `nom-predeploy-build.log`, `nom-predeploy-audit.json`, `nom-predeploy-ship.log`, `nom-predeploy-checkpoint-preview.log`, and `nom-predeploy-inventory.json`.

### Vercel/Git and deletion manual boundaries

Connected Vercel tooling confirms **nom / `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`**, existing domain, and GitHub link **`Crient/nom`**. Both public Supabase variables are still present for Production/Preview/Development. `SUPABASE_SECRET_KEY` remains absent. Existing Google variables and Preview-only QA flag are unchanged.

The actual current Production deployment remains **`dpl_JfwLVekqQQMJZScKrvk8daVUDBDd`**, commit **`c7b834c`**, sourced from Git branch **main**. A Preview deployment exists, but current automatic Preview enablement and exact Production Branch/automatic branch-build/ignored-build settings are **BLOCKED for exact verification**: connector responses omit these controls, and a scoped read-only CLI API request returned missing authentication token (403). No credentials were mined and no login, Git-setting, or project-link write was performed. Standard Vercel Git behavior is automatic production-branch deployment; **treat pushing current main as potentially deploying Production**, and require immediate owner approval before any push. Historical metadata is not represented as proof of the current settings. [Vercel Git deployment behavior](https://vercel.com/docs/git)

The deletion handler requires the exact Nom URL and a modern **`sb_secret_`** credential named **`SUPABASE_SECRET_KEY`**, server only. Public keys and legacy service-role JWTs are intentionally rejected. Connected Supabase tooling cannot retrieve this credential. Manual setup: use an existing modern Secret key from [Nom API Keys](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/settings/api-keys) and enter it directly into [Nom Vercel environments](https://vercel.com/lengs-projects-0ab9a61c/nom/settings/environment-variables), type Secret, **Production only**, with no branch override. Never create `VITE_SUPABASE_SECRET_KEY`, paste the value in chat, or add Preview/Development scopes. Do not rotate/create keys unless separately approved. Saving this value does not deploy.

During the same dashboard handoff, inspect [Nom Git settings](https://vercel.com/lengs-projects-0ab9a61c/nom/settings/git) read-only and report the Production Branch, automatic Production/Preview deployment behavior and any ignored-build rule. Do not save Git changes. These facts are required to give an exact push/deploy plan; the preparation does not silently infer safety from missing API fields.

### Release-facing state and approval gate

| Item | Status | Current truth |
|---|---|---|
| Local checkpoint preparation | PASS | Exact reviewed manifest and final suite ready; no application fix required. |
| New Git commit / pushed branch | BLOCKED | Manifest awaits owner approval; current HEAD remains c7b834c; nothing pushed. |
| New account production deployment | NOT YET DEPLOYED | Existing URL is `https://nom-coral.vercel.app`; no new build has been released. |
| Supabase schema / account ownership / persistence / Guest merge / cross-device sync | PASS | Existing authoritative live results and fixture cleanup remain valid; project ref `iwamwxsosrhxsdcsuoiu`. |
| Confirmation and reset email delivery | PASS | Both real messages received; no repeat sends in this pass. |
| Google OAuth end-to-end on new production | NOT YET DEPLOYED | Owner setup/test-user complete; consent/PKCE return unproven until approved deployment and interactive account access. |
| Confirmation and reset callbacks on new production | NOT YET DEPLOYED | Existing production lacks handlers (historical FAIL); fresh callback validation needs the new build and retained fixture/verifier. |
| New-production session restoration / signout / hydration / focused sync | NOT YET DEPLOYED | Local/live SDK/browser versions already PASS; hosted boundary still pending. |
| Account deletion | BLOCKED | Working-tree foundation/tests PASS; missing Production server credential and undeployed endpoint; no personal-account deletion authorized. |
| Fixture cleanup | PASS | Earlier live/email fixtures and associated account rows removed; no new fixture created in preparation. |
| OAuth secret rotation / broader-launch SMTP | BLOCKED | Separate manual hardening items, not performed or silently bundled into this approval. |

Stop at this reviewable gate for the dashboard handoff and checkpoint approval. No commit, push, deployment, secret retrieval/write, Auth email, Supabase migration/data write, history rewrite, force push, or reset/revert was performed. After the handoff, request the appropriate immediate push/deploy approval, then validate only the previously unproven hosted flows and clean their disposable fixtures after completion.

## Latest redirect diagnosis — October 6, 2026

**Confirmation and reset email delivery remain PASS. Production callback/reset handling is missing; landing at `/home` does not establish successful verification.** The owner reports that both delivered links ultimately landed at `https://nom-coral.vercel.app/home`. This diagnosis made no Auth requests, sent no additional emails, and changed no deployment or remote configuration.

### Actual production build versus working tree

Vercel's lookup by **`nom-coral.vercel.app`**, corroborated by deployment aliases, identifies the actual Production deployment as **`dpl_JfwLVekqQQMJZScKrvk8daVUDBDd`**, project **nom / `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`**, commit **`c7b834ce27c17d7e9c1825f096c4cf350caab837`** ("Add safe Nom ship workflow"). The project's separately reported latest deployment is not the Production alias target; this comparison used the domain's actual target. Local HEAD is the same commit, but the account integration exists in modified/untracked working-tree files and is not in that commit.

The deployed entry bundle **`/assets/index-hhfLwQqF.js`** has neither `auth/callback` nor `account/reset-password` in its route table, no corresponding handler chunks, and retains the wildcard route `path: '*'` → `<Navigate to="/home" replace />`. The commit's `src/routes.jsx` and `src/App.jsx` likewise have neither Auth route nor AuthProvider. The working tree adds both explicit routes and wraps the application in AuthProvider; its callback/reset handler files are absent from the deployed commit.

Read-only HTTP GETs to `/home`, `/auth/callback`, and `/account/reset-password` each returned **200**, no Location header, and identical SPA HTML referencing the same entry bundle. This is an SPA rewrite followed by client-side fallback, not an HTTP redirect to Home. An isolated browser reproduced `/home` for all four targeted probes: each Auth path with no query and with harmless `?error=access_denied`. Neither a callback status nor a reset form appeared. All API/Auth destinations were blocked during browser inspection; the runtime attempted **zero Auth requests**. No real email link, code, token, or user browser session was used.

### Answers to the two redirect hypotheses

1. **Confirmation:** The **working tree** intentionally calls `auth.completeCallback(code)` and redirects only after that succeeds, using `consumeAccountReturn()` with `/home` as the default (`src/pages/AuthCallback.jsx:13`, `src/utils/accountNavigation.js:1`). Missing/invalid code or exchange failure produces an error on the callback page. **Production has no such handler**, so its observed Home landing cannot be attributed to successful callback completion. Direct `/auth/callback` navigation already produces the same Home fallback without Auth interaction.
2. **Password reset:** The **working tree** exchanges the recovery code, removes it from the URL while remaining on `/account/reset-password`, and displays the password form; failures stay on that screen with an error (`src/pages/ResetPassword.jsx:10`). It has no success/error navigation to Home. **Production lacks that route and handler**, and the reproduced wildcard fallback explains why arriving at the reset path lands at Home instead. The exact preceding emailed-link/Supabase redirect chain was not captured, so the final Home URL alone does not verify the configured redirect allowlist or template destination.

| Validation item | Status | Distinction / evidence |
|---|---|---|
| Confirmation email delivery | PASS | Successful request/send stage and explicit owner receipt confirmation, unchanged. |
| Password-reset email delivery | PASS | Successful request/send stage and explicit owner receipt confirmation, unchanged. |
| Local confirmation destination policy | PASS | Source review: successful exchange → remembered safe return, default `/home`; failure → callback error. This is code inspection, not new live confirmation evidence. |
| Local recovery destination policy | PASS | Source review: exchange/form/error remains on `/account/reset-password`; no Home redirect. |
| Production `/auth/callback` handling | FAIL | Handler absent; direct normal/error-path probes reach `/home` through wildcard. |
| Production `/account/reset-password` handling | FAIL | Handler/form absent; direct normal/error-path probes reach `/home` through wildcard. |
| Real confirmation completion and session exchange | BLOCKED | Current deployment cannot handle callback. The disposable account and verifier state were already deleted after delivery validation; clicked messages cannot establish a fresh successful account confirmation/session. |
| Real recovery callback and password replacement | BLOCKED | Current deployment cannot handle recovery; prior disposable account/verifier state was cleaned up. Delivery is not recovery completion. |
| Redirect diagnosis | PASS | Production alias/commit, deployed route table, source comparison, and four isolated path probes agree. |

No email-template/allowlist defect is asserted from the final URL alone. Both missing application handlers explain the reproduced routing behavior regardless of whether a Supabase link returns a code or an error. A future full callback validation must use a build containing these handlers and retain the test account and initiating PKCE storage through the exchange, with cleanup only after that validation. No new sends or deployment are authorized by this diagnosis.

Sanitized HTTP/bundle and browser evidence is retained in `/private/tmp/nom-deployed-redirect-inspect/evidence.json` and `browser-evidence.json`. Only this report changed in the working tree during diagnosis; no product fix was needed to establish the deployment mismatch. Existing passed account/RLS/sync and broad local test/build/catalog suites were not repeated.

## Latest email-delivery retry — October 6, 2026 (delivery PASS)

Scope was limited to the owner's authorized confirmation/reset delivery retry against **Nom / `iwamwxsosrhxsdcsuoiu`**, using the designated controlled mailbox. SMTP remained unchanged and no deployment occurred. No previously passing account/RLS/sync test was repeated. This section supersedes the earlier 429 request blocker below.

Preflight independently reconfirmed the exact Nom project and its enabled modern publishable key; the controlled mailbox still had no account. The installed Supabase SDK used PKCE with separate private signup/recovery storage, a generated password, and validation run `20a4dab9-5ef8-4775-a63f-3207bf1fc95a`. It made exactly one confirmation request and one recovery request; neither returned a session, error, or rate-limit rejection.

| Affected flow | Status | Evidence / boundary |
|---|---|---|
| Confirmation request/send stage | PASS | `/auth/v1/signup` returned HTTP **200** at **22:10:26 UTC**. The disposable account was unconfirmed, with `confirmation_sent_at=2026-10-06 22:10:24.989255+00`. Requested redirect: `https://nom-coral.vercel.app/auth/callback`. |
| Actual confirmation email receipt | PASS | Owner explicitly reports both requested messages arrived in the controlled mailbox. Receipt evidence is the owner's mailbox observation, separately from the API response/send timestamp. |
| Password-reset request/send stage | PASS | `/auth/v1/recover` returned HTTP **200** at **22:10:43 UTC**, with `recovery_sent_at=2026-10-06 22:10:40.431243+00` on the same disposable account. Requested redirect: `https://nom-coral.vercel.app/account/reset-password`. |
| Actual reset email receipt | PASS | Owner explicitly reports both requested messages arrived in the controlled mailbox. No mailbox connector was used; links/tokens were neither requested nor inspected. |
| Confirmation/recovery link and PKCE callbacks | BLOCKED | Not exercised in this delivery-only retry. Requested redirects are recorded, not proof of actual link destinations or callback exchange. The owner was told to leave links unopened; the test account was cleaned up, so these messages must not be used for a later callback test. |
| Disposable account/data cleanup | PASS | Cleanup targeted only UUID `8f2f7a08-511e-4f51-af38-da5df034f1e6`, exact mailbox, and matching validation marker. Sessions were removed first, then the user under a transaction/row-lock guard. Fresh read-only counts confirmed zero matching users, mailbox users, sessions, identities, and fixture rows in all seven account tables. No existing account was changed. |
| Private local credential cleanup | PASS | Generated password and both PKCE storage states removed; sanitized request evidence retained. |

**Confirmation and password-reset delivery PASS.** The default-mailer request blocker cleared for both requests, and the owner's explicit reply, “Both emails arrived,” supplies controlled-mailbox receipt evidence for the messages requested around **6:10 p.m. EDT on October 6**. No more sends are scheduled. This completes the authorized delivery-only scope; it does not establish confirmation/recovery link destinations, account confirmation, PKCE exchange, password replacement, or hosted application readiness. The disposable account and private local credential state were already removed before this receipt confirmation.

Sanitized evidence is retained in `/private/tmp/nom-email-delivery-results.json`. No SMTP/Auth configuration write, secret-key configuration, schema/migration change, Google OAuth test, deployment, or push occurred. Cleanup counts verify fixture removal and do not rerun the account/RLS/sync suite. Application source was untouched; broad local regression/build/catalog suites were not repeated.

## Earlier rate-limited email-delivery attempt — October 6, 2026

Scope: confirmation/reset email delivery only against **Nom / `iwamwxsosrhxsdcsuoiu`**. The owner inspected SMTP and reports custom SMTP disabled/not configured, with Supabase default delivery in use, and designated a controlled Gmail mailbox. No SMTP credentials or settings were changed. This resolves the earlier missing SMTP/mailbox inspection facts; it does not establish delivery readiness.

Before the request, connected tools reconfirmed the exact Nom project and an enabled modern publishable key. A read-only `auth.users` query confirmed the designated mailbox had no existing account, so the test did not modify an existing user's password or identity. At **2026-10-06 20:36:50 UTC**, a real installed Supabase SDK client using PKCE made exactly one `signUp` request to `/auth/v1/signup`, requesting redirect `https://nom-coral.vercel.app/auth/callback`. It used a generated private password and a unique validation marker; no credentials or PKCE verifier were printed.

| Affected flow | Status | Evidence / boundary |
|---|---|---|
| SMTP/mailbox inspection | PASS | Owner reports default mailer, custom SMTP disabled, and a controlled mailbox. |
| Confirmation email request/delivery | BLOCKED | Auth returned HTTP **429**, code **`over_email_send_rate_limit`**. Request not accepted; no returned user/session; inbox delivery not established. |
| Confirmation link/PKCE callback | BLOCKED | No accepted confirmation send or completed callback. Production callback is owner-reported configured; hosted app remains undeployed with the new configuration. |
| Password-reset request/delivery | BLOCKED | Not attempted after the shared email-rate-limit rejection. No test account exists; issuing recovery now would not establish delivery to a valid test account and could consume the limited quota. |
| Recovery link/PKCE callback | BLOCKED | No recovery email or callback available. |
| Test-account cleanup | PASS | Post-request read-only query reconfirmed no account for the designated mailbox. No remote cleanup mutation was needed. Private generated password/verifier state was removed locally. |

This is an external rate-limit blocker, not an observed application defect. Supabase's default delivery currently permits only project-team recipients and documents a limit of two messages per hour. The 429 does **not** establish whether this mailbox is eligible, nor does it establish that an email reached the inbox. Recipient eligibility remains unverified until a request can be accepted or the owner inspects organization-team membership. [Supabase default SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp)

Next step: allow the email quota to recover, with no other Nom Auth email requests during the wait, then retry the confirmation request once. A one-hour quiet period is a conservative retry interval under the documented hourly quota, not a verified Retry-After value or delivery guarantee. After an accepted request, the owner must inspect Inbox/Spam for the actual confirmation message; no mailbox connector is available. Do not paste confirmation links, OTPs, credentials, or tokens into chat. Reset delivery remains pending until a valid test account and available quota permit it.

Sanitized request evidence is retained at `/private/tmp/nom-email-delivery-results.json`; the temporary runner is `/private/tmp/nom-email-delivery-validation.mjs`. No deployment, push, remote configuration write, schema/migration change, Google OAuth test, existing PASS account/RLS/sync rerun, or application-code change occurred. Broad test/build/catalog suites were not repeated for this configuration inspection and delivery probe.

## Latest manual Auth update — October 6, 2026

The owner reports the following changes in target Supabase **Nom / `iwamwxsosrhxsdcsuoiu`**. This update supersedes the earlier Google-disabled and production-redirect-unknown configuration states below. Configuration facts are owner-reported; no independent dashboard inspection or live OAuth/email callback test was performed in this update.

| Configuration item | Updated state | Evidence boundary |
|---|---|---|
| Site URL | CONFIGURED: `https://nom-coral.vercel.app` | Owner reports saved setting. |
| Production OAuth callback allowlist | CONFIGURED: `https://nom-coral.vercel.app/auth/callback` | Owner reports URL included. |
| Production password reset allowlist | CONFIGURED: `https://nom-coral.vercel.app/account/reset-password` | Owner reports URL included. |
| Google Web application client | CONFIGURED | Owner reports client created. Credentials were not requested or printed. |
| Google → Supabase callback registration | CONFIGURED | Owner reports Supabase callback registered; expected Nom callback is `https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback`. |
| Supabase Google provider | ENABLED | Owner reports enabled provider; previous disabled-provider probe is historical. |
| Google OAuth test user | CONFIGURED | Owner reports their Google account added as a test user. |

**Live Google consent/PKCE callback remains unvalidated; real confirmation/reset delivery remains BLOCKED.** Configuration completion does not establish a live integration PASS. Existing passing account/RLS/sync flows and the verified public Vercel configuration remain unchanged. No deployment, remote configuration write, secret-key configuration, signup, email send, or repeat validation was performed by the assistant in this update.

The next manual blocker is **Auth email delivery configuration and a controlled test mailbox**. Open [Nom Auth SMTP settings](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/auth/smtp), inspect whether custom SMTP is enabled, and report that yes/no fact plus the mailbox to use for confirmation/reset testing. Keep SMTP credentials out of chat and do not save changes yet. The assistant is waiting for those nonsecret facts before proposing any necessary configuration write or delivery test. Previously recorded hosted/deletion deployment boundaries remain in effect.

## Approved public Vercel configuration — October 6, 2026

**Public Vercel configuration PASS.** The owner explicitly approved creating only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production, Preview, and Development in Vercel project `nom`, without deployment or secret-key configuration. This section supersedes the missing-public-variable state recorded in the earlier inspections below; prior live application PASS results were not rerun.

Immediately before the write, connected tools independently reconfirmed Supabase **Nom / `iwamwxsosrhxsdcsuoiu`** and Vercel **nom / `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`**, account `team_ely71EC4Ov5TDqgbqA0ZSXBc`, domain `nom-coral.vercel.app`. Both variable names were absent, with zero hidden Production entries. The enabled modern `default` publishable key remained ID `62665e6c-4307-460e-b5e5-27a6f3548a7f`.

| Approved variable | Production | Preview | Development | Verification |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Present | Present | Present | PASS: exact verified Nom URL; Config/plain; one entry; no branch override. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Present | Present | Present | PASS: exact enabled Nom publishable key; Config/plain; one entry; no branch override; value withheld. |

The structured batch created exactly two entries, IDs `bqgUIyylE8vuWcTh` and `N3kvpLtKjcwG2GsJ`, with no failed entries. A fresh metadata read with secret decryption disabled confirmed the saved public values and all three targets. Every pre-existing environment entry was unchanged; `SUPABASE_SECRET_KEY` remains absent. A fresh project read confirmed the latest deployment was unchanged. No Supabase setting/schema/data write, secret-key configuration, deployment, or push was performed.

The first create request encountered an automatic permission-review timeout. A read-only recheck confirmed no variables had been created; the single permitted retry of the identical approved batch succeeded. The timeout was not a security rejection.

| Remaining affected integration item | Status | Boundary / next required action |
|---|---|---|
| Public Vercel configuration | PASS | Saved and verified for all three approved environments. |
| Hosted application using new public settings | BLOCKED | Existing deployment does not inherit new settings; deployment remains prohibited. |
| Google OAuth configuration and consent/callback | BLOCKED | Await owner's read-only Google Cloud/provider inspection described below; no provider write authorized. |
| Auth production redirect allowlist and real confirmation/reset delivery | BLOCKED | Await dashboard configuration facts and controlled mailbox; no redirect/SMTP write authorized. |
| Hosted account deletion | BLOCKED | Hosted `/api/account` was previously 404; server secret is absent and explicitly excluded from this approval. Endpoint availability needs a separately authorized deployment. |

Verification was limited to the changed Vercel configuration. No existing PASS signin/RLS/persistence/sync flow, test/build/catalog suite, or Auth fixture was repeated because application code and runtime deployment did not change. The manual read-only preparation steps below remain pending; no additional remote write is authorized.

## Earlier remaining-blocker configuration review — October 6, 2026 (before public-variable approval)

Scope is restricted to the four remaining blockers. No previously passing integration flow was rerun. No remote configuration write, Auth fixture, migration, deployment, or push occurred in this review. The earlier live PASS results remain valid for their documented configuration and local-runtime boundary.

Read-only project metadata reconfirmed **Nom / `iwamwxsosrhxsdcsuoiu`** and Vercel **nom / `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`**, account `team_ely71EC4Ov5TDqgbqA0ZSXBc`, domain `nom-coral.vercel.app`. Public Auth settings reconfirmed email enabled, signup enabled, confirmation required, and Google disabled. No user signin/signup/reset was attempted.

| Blocked item | What connected tools can obtain/do | Current state | Next step / approval boundary |
|---|---|---|---|
| Vercel public account configuration | Supabase returns exact project URL and enabled modern publishable key. Vercel supports a structured batch create of project environment variables. | URL/key missing in Production, Preview, Development. | Prepared two Config/plain variables for all three scopes; await explicit owner approval before creating either. |
| Google OAuth | Public Auth settings expose disabled status. Supabase connector has no Auth configuration getter/setter; no Google Cloud connector is available. | `external.google=false`. | Owner must inspect existing Google Web client and Google provider settings. Client secret stays in secure dashboard entry. Proposed write only after owner approves exact settings. |
| Auth production/local redirects and delivery | Public settings reveal confirmation behavior but not Site URL, redirect allowlist, SMTP credentials or complete email templates. No authenticated Supabase management token is present in the inspected environment/CLI credential locations. | Site URL/allowlist/SMTP remain unverified; confirmation remains required. | Owner dashboard inspection and controlled valid mailbox are required. No default-mailer/SMTP absence is assumed. |
| Hosted deletion | Vercel can create a server-only Secret environment variable if securely supplied; Supabase connector returns publishable keys only, not `sb_secret_` keys. | Secret missing in every Vercel scope. A read-only GET `https://nom-coral.vercel.app/api/account` returned HTTP **404**, `text/plain`. | Obtain existing Nom secret from API Keys dashboard and approve Production-only secret configuration. Hosted endpoint availability additionally needs a future separately approved deployment; saving env values does not update an existing deployment. |

### Concrete prepared public-variable write (not executed)

- Project: `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6` / `nom`; account `team_ely71EC4Ov5TDqgbqA0ZSXBc`.
- `VITE_SUPABASE_URL`: `https://iwamwxsosrhxsdcsuoiu.supabase.co`.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: selected enabled `default` modern publishable key, ID `62665e6c-4307-460e-b5e5-27a6f3548a7f`; value withheld.
- Both: Config/plain, Production + Preview + Development, no branch override. All three scopes connect to the same explicitly authorized Nom project.
- Create only missing entries; recheck metadata immediately before an approved write so unexpected existing values are not overwritten. No other environment variables or project settings are included.
- `SUPABASE_SECRET_KEY` is excluded from this pending batch. It requires secure credential availability and its own explicit approval; proposed hosted deletion scope is Production only.

### Exact manual read-only preparation

1. Open [Nom Auth URL Configuration](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/auth/url-configuration). Report current Site URL and allowed redirect URLs. Proposed production Site URL is `https://nom-coral.vercel.app`; required production redirect paths are `https://nom-coral.vercel.app/auth/callback` and `https://nom-coral.vercel.app/account/reset-password`. Local affected-flow validation without deployment will require `http://localhost:5173/auth/callback` and `http://localhost:5173/account/reset-password`. Inspect before requesting additions/replacements; preserve existing trusted entries. No wildcard Preview domains are proposed.
2. In [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), select the Google Cloud project intended for Nom and locate an existing **Web application** OAuth client. Report whether it exists, its nonsecret Client ID, whether its authorized origins include `https://nom-coral.vercel.app` and `http://localhost:5173`, and whether its redirect URI is exactly `https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback`. Also confirm a controlled Google account is available in Audience/Test users where applicable. Open [Nom Auth Providers](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/auth/providers), then Google, to inspect its displayed callback/provider state. Keep the Client Secret out of chat, source, and browser variables. No client creation, rotation, provider enablement, or Save is authorized yet.
3. Open [Nom Auth SMTP settings](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/auth/smtp) and report whether custom SMTP is enabled. Identify one valid mailbox controlled by the owner for disposable app-account confirmation/reset tests. With the built-in mailer, use an existing Supabase organization-member mailbox; other recipients require configured custom SMTP. Inspect confirmation and password-recovery templates to ensure they retain an appropriate verification link/redirect rather than a hardcoded production root. Report only nonsecret configuration facts. No SMTP setting/template write or email send is performed in this review.
4. Open [Nom API Keys](https://supabase.com/dashboard/project/iwamwxsosrhxsdcsuoiu/settings/api-keys) and confirm an existing modern `sb_secret_` key is available. Do not paste the key or create/rotate one yet. After explicit approval it can be entered directly as Production-only Secret `SUPABASE_SECRET_KEY` in [Nom Vercel environment settings](https://vercel.com/lengs-projects-0ab9a61c/nom/settings/environment-variables), so the assistant need not receive or print it. Keep it out of every `VITE_*` variable.

After approved changes, revalidate only affected items: Vercel variable metadata/key-to-project binding; Google authorize and full consent/PKCE return; actual signup/confirmation and reset-delivery/callback using the chosen mailbox; secret-dependent deletion against disposable actors after the endpoint is available. Hosted confirmation/deletion cannot be marked PASS while the necessary hosted build/endpoint is unavailable and deployment remains prohibited. Record new results separately without rerunning the already-passing all-table persistence/RLS/merge/offline suite unless a relevant change justifies it.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase SMTP restrictions/setup](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase API-key privilege boundaries](https://supabase.com/docs/guides/getting-started/api-keys), [Vercel environment changes apply to new deployments](https://vercel.com/docs/environment-variables).

## Current results — October 6, 2026

This section supersedes the historical pre-migration/approval-policy blockers below. Target independently verified as **Nom / `iwamwxsosrhxsdcsuoiu`**, `ACTIVE_HEALTHY`, `us-west-2`. The already-applied migration `202610060001_nom_accounts.sql` was not rerun, recreated, or edited. Remote history still contains exactly `202610060001 / nom_accounts`.

**Core live email/session/RLS/persistence/sync flows PASS. Release readiness remains BLOCKED by external Auth/environment configuration.** The final SDK/store run recorded **30 PASS, 0 FAIL, 5 BLOCKED**; the isolated mobile browser run recorded **8 PASS, 0 FAIL**. Database rollback-based RLS assertions also passed. These are real Supabase/Auth/PostgREST round trips, not the existing mock SDK tests. No application defect requiring a product-code fix was found.

### Safe fixtures and evidence boundaries

Three disposable users were provisioned through the authorized Nom database connection with a unique run marker, random UUIDs, non-deliverable `example.invalid` email addresses, and bcrypt password hashes: A/B confirmed and a third unconfirmed. No real person's account was used. Real password signin, remote user verification, token refresh, session restoration, SDK mutations, and browser flows used the publishable key and those users' actual Auth sessions. Provisioning confirmed fixtures does **not** establish that public signup, email delivery, or an emailed PKCE callback works.

A signup and password-recovery probe intentionally used reserved non-deliverable addresses; both returned HTTP 400 `email_address_invalid`. No signup session/user was created by the probe. Email delivery/confirmation/reset remain BLOCKED until a controlled valid mailbox and delivery configuration are available; SMTP configuration could not be inspected, so this report does not assume SMTP is absent. Google authorize returned HTTP 400 `validation_failed`, “Unsupported provider: provider is not enabled.”

For the SDK run, the actual production `cloudRepository`, `syncEngine`, normalization, and Experience domain modules were loaded through Vite SSR. Independent SDK sessions/storage represented devices. The network and RLS transport was never mocked. A lost acknowledgement was injected **after a real successful backend write** to exercise retry. Real browser contexts at 390×844 additionally mounted the complete AuthProvider/application, used labelled signin/profile/consent controls, reloaded, disconnected/reconnected networking, and interacted with both QA playgrounds. No connected user dashboard browser was available; the local browser was an isolated headless Chromium instance.

The local validation server received only the real public URL/publishable key as process-local settings; existing `.env.local`, Google keys, Vercel environments, Auth settings, and server credentials were not changed. The secret deletion key was unavailable. The hosted application was not rebuilt/deployed and does not inherit the local validation settings.

### Existing security warnings: exact impact and disposition

**Investigation PASS; two pre-existing advisor warnings remain unchanged.** `public.rls_auto_enable()` is owned by `postgres`, is SECURITY DEFINER, returns `event_trigger`, and fixes its search path to `pg_catalog`. It backs the existing `ensure_rls` event trigger and matches Supabase's documented automatic-RLS example. Its creation provenance was not independently established. It predates the Nom migration, is not defined by it, and is not one of Nom's three invoker functions or a component of account signin/sync authorization. It does apply RLS to newly created public tables, including the account tables when they were created.

The warnings identify broad EXECUTE grants to `anon` and `authenticated`. For an ordinary callable SECURITY DEFINER function that can expose its owner's `postgres` privileges. This specific function only obtains DDL-event commands and enables RLS on newly created public tables; it has no user-data read path and no arbitrary caller-supplied SQL or target argument. Neither API role has CREATE on schema public. Direct read-only SQL probes returned without a DDL change, whereas its actual REST RPC returned **HTTP 400 / `0A000` / `cannot display a value of type event_trigger`**. An attempted external call to `pg_event_trigger_ddl_commands()` itself is rejected outside event-trigger context (`39P03`). These observations do not demonstrate an account-data exposure or caller-selected DDL path. They also do not make broad execute grants a desirable general pattern.

No change to this existing schema object was necessary to validate Nom. No revocation, return-type change, invoker conversion, or replacement was made. This is not a zero-warning security signoff; both warnings were reconfirmed after cleanup. References: [anonymous EXECUTE warning](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated EXECUTE warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Supabase auto-enable RLS example](https://supabase.com/docs/guides/database/postgres/row-level-security#auto-enable-rls-for-new-tables).

### Auth configuration and redirect verification

| Setting / flow | Status | Observed behavior / remaining boundary |
|---|---|---|
| Email/password provider | PASS | Public Auth settings: `external.email=true`; two users actually signed in. |
| Signup enabled | PASS | `disable_signup=false`; delivery/signup completion separately BLOCKED. |
| Confirmation requirement | PASS | `mailer_autoconfirm=false`; unconfirmed fixture denied with `email_not_confirmed`. |
| Google provider | BLOCKED | `external.google=false`; actual authorize endpoint rejects provider. Google client credentials and provider setup required. |
| App callback route | PASS | Application uses `${window.location.origin}/auth/callback`; route and SDK redirect construction inspected. |
| Google → Supabase callback registration | BLOCKED | Expected `https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback`; Google console registration/client credentials not accessible. |
| Site URL and callback redirect allowlist | BLOCKED | Public `/auth/v1/settings` omits these fields; authenticated management Auth API/dashboard access unavailable. Expected production Site URL is `https://nom-coral.vercel.app`; expected app callback is `/auth/callback`. |
| Password reset app URL | PASS | SDK requests `${window.location.origin}/account/reset-password`; route exists and requires callback exchange. |
| Delivered confirmation/reset links and PKCE exchange | BLOCKED | Requires actual controlled inbox and verified redirect configuration. Fixture login cannot establish this. |
| Persisted session/refresh/local signout | PASS | Real SDK + full-page browser reloads and independent device session checks passed. |
| Authenticated password update | PASS | Real update rejected old password and accepted new password; fixture password restored before cleanup. |

### Vercel Nom environment inspection (metadata only; no values)

Verified existing Vercel project **nom / `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`**, account **`team_ely71EC4Ov5TDqgbqA0ZSXBc`**, domain `nom-coral.vercel.app`. Environment metadata returned zero hidden production entries. No values were decrypted or printed, and no environment variable was added/edited.

| Variable | Production | Preview | Development | Live deployment readiness |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Missing | Missing | Missing | BLOCKED |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Missing | Missing | Missing | BLOCKED |
| `SUPABASE_SECRET_KEY` | Missing | Missing | Missing | BLOCKED for account deletion; not needed for signin/sync |
| `GOOGLE_PLACES_API_KEY` | Present | Present | Missing | Preserved |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Present | Present | Missing | Preserved |
| `VITE_GOOGLE_MAPS_MAP_ID` | Present | Present | Missing | Preserved |
| `VITE_ENABLE_REWARD_QA` | Missing | Present | Missing | Preserved |

The deletion handler only accepts the allowlisted Nom URL and a server-only `sb_secret_` key, resolves the actor using remote `auth.getUser(token)`, and deletes only that user. Local GET `/api/account` actually returned `deletionConfigured:false`, and the mounted Delete account button was disabled. A real caller-only DELETE request through that handler remains BLOCKED by the missing credential; no fabricated privileged key or alternative endpoint was used to claim a pass.

### Live SDK / application-store integration matrix

| Flow | Status | Evidence |
|---|---|---|
| Auth configuration: email/password and confirmation | PASS | Email enabled; signup allowed; automatic confirmation disabled. |
| Google OAuth | BLOCKED | Provider disabled; Google credentials/setup required. |
| Email confirmation enforcement | PASS | Unconfirmed disposable user denied with email_not_confirmed. |
| Real email/password signin | PASS | Two independently authenticated users; invalid password denied; users verified remotely. |
| SDK session restoration and refresh | PASS | Fresh SDK instance restored persisted session and refreshed through real Auth. |
| rls_auto_enable REST exposure | PASS | RPC invocation rejected (0A000); function has event_trigger return type, not a Nom mutation/RLS helper. |
| Real REST RLS: profiles | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: dish_favorites | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: restaurant_favorites | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: recent_dish_views | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: meal_logs | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: opened_boxes | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Real REST RLS: collectible_favorites | PASS | Anonymous denied; A/B own rows visible; other owner hidden; forged insert/update blocked; delete denied. |
| Profile persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Dish favorites persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Restaurant favorites persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Recent dish views persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Meal logs persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Opened boxes persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Collectible favorites persistence | PASS | Application repository wrote and read real PostgREST rows with original identifiers/events. |
| Recent-view newest timestamp | PASS | Older RPC write retained the newer persisted view; direct upsert also covered by SQL suite. |
| Experience rehydration | PASS | Domain replay reconstructed progress/unlocks, recorded reward/duplicate, original days and IDs. |
| Guest → Merge & Sync | PASS | Consent required; Guest relationships/events uploaded; repeat merge idempotent; Guest bytes preserved. |
| Use account data only | PASS | B declined Guest import; cloud B unchanged; same-device Guest bytes preserved. |
| Identity isolation G → A → G → B → G | PASS | Production store used separate account caches; Guest retained its original data. |
| Offline durable outbox → real Supabase | PASS | Offline favorite survived store recreation and drained to real backend on retry. |
| Retry and idempotency | PASS | Actual committed write retried after simulated lost response; meals/boxes replayed without duplicate events or rewards. |
| Cross-device hydration | PASS | Fresh local storage and independent real Auth session hydrated merged favorites and complete Experience. |
| Cross-device unfavorite tombstones | PASS | Second device honored inactive remote relationship without resurrecting cached favorite. |
| Signout/signin restoration | PASS | Real local signout cleared session; another device remained valid; stale repository refused writes; signin restored cloud data. |
| Authenticated password update | PASS | Actual update invalidated previous password; updated login succeeded; disposable fixture password restored. |
| Signup/confirmation delivery | BLOCKED | Confirmed fixtures were provisioned via authorized SQL; real inbox delivery/confirmation callback requires SMTP and controlled mailbox. |
| Password reset email + callback | BLOCKED | Recovery route exists; delivered recovery link and configured redirect allowlist require dashboard/API access and controlled mailbox. |
| Auth Site URL / redirect allowlist | BLOCKED | Public settings omit Site URL/allowlist; no connected dashboard or management Auth credentials available. |
| Account deletion endpoint | BLOCKED | Server-only secret missing locally and in all Vercel environments; no privilege workaround used. |

### Mounted mobile browser integration matrix

| Flow | Status | Evidence |
|---|---|---|
| Browser email signin + Guest Merge & Sync | PASS | Mobile viewport mounted AuthProvider and real repository; consent prompt completed and profile synced. |
| Browser session restoration | PASS | Full page reload restored SDK session, account identity and persisted profile. |
| Browser cross-device hydration + Experience history | PASS | Second isolated browser context signed in independently and hydrated profile plus real meal/history state. |
| Browser offline outbox + online retry | PASS | Actual browser went offline; profile mutation queued and synchronized to second device after reconnection. |
| QA playground interaction isolation | PASS | Reward triggers/reveal/reset and Experience mystery-box fixture made zero Supabase mutations and preserved Guest/account cache bytes. |
| Deletion capability foundation | PASS | Real local server reports deletionConfigured=false; mounted UI disables deletion without a secret. |
| Browser identity isolation + account-only + signout | PASS | G→A→G→B→G retained Guest profile and isolated B; account-only consent imported no Guest data. |
| Google Places preservation | PASS | Live account/browser tests made no Places or Maps requests. |

### Live database assertions and cleanup

| Check | Status | Evidence |
|---|---|---|
| Seven-table RLS SQL suite | PASS | Existing `supabase/tests/accounts_rls.sql` executed on Nom in a transaction with temporary assertion helpers and rollback. Tests cover anonymous privileges, A/B row isolation, cross-user insertion/update, ownership reassignment, no-subject access, event immutability, timestamp rules, replay and owner deletion cascades. No application schema was recreated. |
| Deletion cascade foundation | PASS | Both rollback assertions and actual disposable-user cleanup removed associated rows from every account table while respecting the other-user boundary. This does not substitute for testing the secret-dependent HTTP handler. |
| Disposable users/sessions cleanup | PASS | Deleted sessions first, then only the three exact UUIDs matching this run marker. Remaining fixture users/sessions: 0; total Auth users: 0, matching the inspected initial baseline. |
| All seven account tables empty again | PASS | `profiles`, `dish_favorites`, `restaurant_favorites`, `recent_dish_views`, `meal_logs`, `opened_boxes`, `collectible_favorites` each have 0 rows after cleanup. |
| Existing migration history preserved | PASS | Exactly `202610060001 / nom_accounts`; no new migration applied. |
| QA/demo isolation | PASS | Both browser QA playground interactions made zero REST mutations and left Guest/account cache bytes unchanged. Source/mutation filtering and local regressions additionally cover demo seed exclusion. Real stored event source was `live-validation`, not QA/demo seed. |

### Full local regression / security / package suite

| Check | Status | Result |
|---|---|---|
| `npm test` | PASS | 971/971 tests in 58/58 files; embedded Python suites: 16 + 40 tests passed. |
| `npm run build` | PASS | Catalog validation, account credential validation, Vite production build, emitted-bundle credential scan. |
| `npm run catalog:check` | PASS | 201 unique records in original workbook order. |
| `npm ls --depth=0` | PASS | Existing installed package tree valid; package manifest/lockfile not edited. |
| `npm audit --json` | PASS | 0 vulnerabilities at every severity. |
| `node scripts/validate-account-secrets.mjs --dist` | PASS | No privileged browser environment/reference/embedded keys. |
| `npm run ship -- --dry-run` | PASS | Temporary index only; migration and SQL test artifacts included; no commit/push/deployment. |
| `git diff --check` / live-runner syntax | PASS | No whitespace errors; opt-in runner parses. |
| Catalog/recommendations/Guest/Places preservation | PASS | No product source, assets, catalog, recommendation engine, dependency, Places setting, or migration file changed by this pass. Existing regression suite passed. Actual browser account/QA validation made zero Places/Maps API requests. |

Changes in this pass: this report and `scripts/validate-live-accounts.mjs`, an opt-in live validator that requires a private disposable-fixture config, allowlists Nom, uses real SDK/production data modules, and does not provision users or alter schema. Its failure reporting excludes credentials. The headless browser harness and process-only server stayed in `/private/tmp`. Earlier attempts corrected test-harness timestamp-format comparisons, the actual catalog ID `fish-amok`, form selector ambiguity, and a font-request counter; these required no product changes. Final results above are from successful runs, not those preliminary assertions.

Sanitized detailed SDK/browser/settings/probe evidence is retained in ignored JSON files beside this report. Full local logs and npm advisory metadata are in `/private/tmp/nom-live-*`; no passwords, API secrets, or session tokens are included in report/evidence. Disposable fixture credentials were removed from the temporary config after cleanup. The local validation server was stopped. No Git staging, commit, push, Vercel deployment/promotion, new project, or other Supabase project operation was performed.

### Remaining external/manual blockers

1. Connect an authenticated Nom dashboard or provide authorized management access securely so Site URL, callback/reset allowlist and SMTP settings can be inspected. Inspect settings before changing them. The current CLI has no Supabase login/access token, and no connected dashboard browser was available.
2. Configure Google OAuth in the existing Nom project using the owner's Google Web client credentials and exact Supabase callback, then use a controlled Google test account to verify both redirects and consent. Provider is currently disabled.
3. Provide a controlled valid mailbox with working Auth delivery to exercise real signup, email confirmation, recovery link and PKCE callback. Reserved fixture addresses deliberately cannot validate delivery.
4. Install the real public Supabase settings in intended Vercel environments when authorized. Supply the Nom secret securely, server-side only, to complete caller-only account deletion testing. No secret should be pasted in chat or source.
5. A future hosted-app verification requires a separately authorized build/deployment because Vite public settings are build-time inputs. This run intentionally performed neither deployment nor push.

---

## Historical implementation coverage and pre-migration validation

Everything below is preserved historical evidence. Its `never`-policy, empty-schema and untested-sync statements describe the earlier pre-migration attempt and are superseded by the current live results above. Do not repeat its migration steps.


Original specification: “NOM — FULL SUPABASE AUTH, ACCOUNT SYSTEM, CROSS-DEVICE SYNC, GUEST MIGRATION, OFFLINE CACHE, SECURITY, AND PRODUCTION FOUNDATION”, attachment `60d2ccb0-7de8-4698-8939-8996752ba50c/Pasted text.txt`. Read in full before implementation: 2,513 logical lines (2,512 newline characters); SHA-256 `4b4fa5540d890229e156a80eba000e3470f4394fee8d1e377d8e349691c1ac54`. All 113 original numbered sections are represented below. The onboarding and stabilization reports provide evidence and do not replace this specification.

This initial coverage matrix was recorded before further application changes. Entry baseline: 961 passing Vitest tests in 58 files, successful build/catalog/dependencies/scanner/packaging, and 765 nonignored files preserved by SHA-256 inventory. “COMPLETE BUT NOT LIVE-VALIDATED” means implementation and local/mocked checks exist, not that real Supabase/Auth/production behavior has been confirmed. “BLOCKED BY EXTERNAL CONFIGURATION” identifies actions requiring authenticated access or missing runtime/configuration.

The unnumbered project/preamble/non-goals/safety requirements are also binding: one root agent; preserve prior uncommitted work; optional accounts; source-controlled 201-dish catalog/imagery; target only Nom `iwamwxsosrhxsdcsuoiu`; no new project; no social/ML/payment/other provider features; no secret disclosure; no silent Guest merge; no QA/demo uploads; no destructive DDL against unknown data; no automatic commit/push/deployment. These are being maintained throughout this continuation.

## Original-spec requirement coverage matrix (historical entry snapshot)

This matrix preserves the earlier continuation's starting assessment. Its final-classification column was an unfinished snapshot, not evidence of completed live validation. The October 6 integration results below supersede it for current status; setup documentation and several local regressions already existed when this verification pass began.

| Section | Original requirement | At continuation entry | Final classification | Evidence and remaining boundary |
|---|---|---|---|---|
| 1 | PRESERVE CURRENT NOM | COMPLETE | COMPLETE | 765-file preservation inventory; catalog/image guards and existing product tests. No product redesign. |
| 2 | HOME QUICK-ACTION CLEANUP | COMPLETE | COMPLETE | Home.jsx and AccountFlows: exactly Explore, Log Meal, Favorites, Progress; four columns; no Trending. |
| 3 | PUBLIC APP DEFAULT NAME CLEANUP | COMPLETE | COMPLETE | persistedState EMPTY_ACTIVITY=Explorer; valid stored names preserved; meaningfulName ignores neutral names. |
| 4 | INSTALL SUPABASE CLIENT | COMPLETE | COMPLETE | Supabase SDK already installed; centralized allowlisted client; .env.example; browser/server boundary scanner. |
| 5 | SUPABASE UNCONFIGURED MODE | COMPLETE | COMPLETE | Auth unconfigured state and mounted Guest flows pass without SDK/network; basic features remain local. |
| 6 | AUTH ARCHITECTURE | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Auth.jsx exposes session/readiness/configuration/errors and Google/email/reset/signout/refresh actions; live Auth unavailable. |
| 7 | AUTH BOOTSTRAP SAFETY | COMPLETE | COMPLETE | App JourneyBoundary waits for authReady; slow-bootstrap/newer-event and keyed-identity tests. |
| 8 | ACCOUNT ROUTES | COMPLETE | COMPLETE | /account, /auth/callback, /account/reset-password registered; safe return allowlist; no redirect loops in tests. |
| 9 | ACCOUNT PAGE | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Nom account page offers Google, email registration/login/reset, Guest exit; labelled/loading/error forms; mounted tests. |
| 10 | WELCOME INTEGRATION | COMPLETE | COMPLETE | Welcome Get Started primary, Sign in to sync secondary; optional auth tested. |
| 11 | PROFILE: GUEST STATE | COMPLETE | COMPLETE | Guest Profile has device-local copy, status and account CTA; no feature gating. |
| 12 | PROFILE: SIGNED-IN STATE | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Profile exposes name/email/provider/avatar/status and settings/signout; cloud identity restoration mocked. |
| 13 | GOOGLE AUTH | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Supabase Google PKCE call and safe callback/return implemented/tested; provider configuration externally blocked. |
| 14 | EMAIL/PASSWORD AUTH | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Email signup/signin/reset/update and confirmation message implemented; real delivery/provider validation blocked. |
| 15 | PROFILE CREATION | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Repository idempotently ensures profile; tested cloud > approved Guest > provider > Explorer name precedence/editing. |
| 16 | GOOGLE AVATAR | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | HTTPS provider avatar rendered; profile/avatar fields exist; no upload bucket or custom storage added. |
| 17 | DATABASE MIGRATION LOCATION | COMPLETE | COMPLETE | supabase/migrations/202610060001_nom_accounts.sql is packaged; application to real target not confirmed. |
| 18 | DATABASE DESIGN PHILOSOPHY | COMPLETE | COMPLETE | cloudState source events/relations normalize through existing Experience logic; no authoritative progress counters. |
| 19 | DO NOT DUPLICATE DISH CATALOG | COMPLETE | COMPLETE | No Supabase dish catalog/image bucket; stable local dish IDs; 201 source-controlled catalog records. |
| 20 | DATABASE SCHEMA: PROFILES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | profiles PK/cascade/name/avatar/timestamps constraints and stamp trigger in migration; no executed DB evidence. |
| 21 | DATABASE SCHEMA: DISH FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | dish_favorites composite PK/is_active/server updated_at/cascade; application tombstone regressions. |
| 22 | DATABASE SCHEMA: RESTAURANT FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | restaurant_favorites composite PK/is_active/server timestamp; only stable restaurant ID persisted. |
| 23 | DATABASE SCHEMA: RECENT DISH VIEWS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | recent_dish_views composite PK/viewed_at; greatest-timestamp RPC and trigger; actual SQL execution pending. |
| 24 | DATABASE SCHEMA: MEAL LOGS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | meal_logs retains original ID, dish/restaurant/country, local_day, verification, feedback, created timestamp; cascade. |
| 25 | MEAL LOG CONSTRAINTS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Migration verification/reaction/country/id/length checks align with normalizers and existing domain fixtures. |
| 26 | DATABASE SCHEMA: OPENED BOX EVENTS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | opened_boxes immutable original choice/duplicate/time; owner/box PK and owner/visit FK; cascade. |
| 27 | DATABASE SCHEMA: COLLECTIBLE FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | collectible_favorites owner/country/collectible PK, is_active, timestamp/cascade; normalize unlocked favorites. |
| 28 | DEMO SEED STATE | COMPLETE | COMPLETE | isUserMeal/mutation/SQL guards reject demo-seed and QA events; demo local state not uploaded. |
| 29 | ROW LEVEL SECURITY | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | All seven tables have enabled RLS and own-row SELECT/INSERT; permitted mutable UPDATE policies only. |
| 30 | GRANTS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Explicit PUBLIC/anon/authenticated revoke; authenticated least privilege; no event UPDATE/DELETE grants. |
| 31 | EVENT TABLE MUTABILITY | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Historical events SELECT/INSERT only; ignoreDuplicates transport; mutable relationships/profile UPDATE allowed. |
| 32 | RLS PERFORMANCE | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Ownership-leading PKs and time indexes; (select auth.uid()) policy expressions; remote advisor pending. |
| 33 | AUTH PROFILE TRIGGER | COMPLETE | COMPLETE | Safer application profile creation chosen; no fragile auth.users trigger; invoker functions with empty search_path. |
| 34 | DATABASE SECURITY ADVISOR | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Supabase integration not connected; real Security/Performance Advisor cannot run yet. |
| 35 | CURRENT LOCAL PERSISTENCE | COMPLETE | COMPLETE | Existing normalizers/versioned reader/recovery writer and React section providers retained. |
| 36 | IDENTITY-SCOPED LOCAL STORAGE | COMPLETE | COMPLETE | nom.v2.guest.* and user UUID cache/outbox namespaces; SDK credential namespace separate. |
| 37 | LEGACY LOCAL STORAGE MIGRATION | COMPLETE | COMPLETE | Legacy bytes copied once; originals kept; newer/corrupt envelope guards; retry/idempotency tests. |
| 38 | IDENTITY BOUNDARY | COMPLETE | COMPLETE | Keyed ScopedJourney remount; Discovery and account data separated; G/A/G/B/G tests. |
| 39 | GUEST MODE | COMPLETE | COMPLETE | Guest Favorites/History/meal/progress/rewards/collections remain usable; only cross-device sync requires Auth. |
| 40 | MEANINGFUL GUEST DATA DETECTION | COMPLETE | COMPLETE | Detection ignores defaults/demo/drafts/Discovery/QA; recognizes custom name, favorites/views/logs/openings. |
| 41 | GUEST → ACCOUNT MIGRATION PROMPT | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Explicit Bring your Nom journey modal with Merge & Sync/account-only actions; mounted consent test. |
| 42 | WHY MIGRATION MUST BE EXPLICIT | COMPLETE | COMPLETE | No Guest enqueue before affirmative merge; account-only and signout retain original Guest scope. |
| 43 | USE ACCOUNT DATA ONLY | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Decline records fingerprint and displays cloud state; Guest bytes preserved; store and UI tests. |
| 44 | MERGE: DISH FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Merge active favorites without duplicates; subsequent unfavorites use tombstones; live DB pending. |
| 45 | MERGE: RESTAURANT FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Stable restaurant IDs unioned; no Places payload persisted; representative merge fixture. |
| 46 | MERGE: RECENT DISH VIEWS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Merge newest view per dish; RPC/trigger greatest protects older offline upload; SDK regression. |
| 47 | MERGE: MEAL LOGS | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Stable meal ID union; ignoreDuplicates; domain replay credits once; partial merge retries tested. |
| 48 | MERGE: OPENED BOXES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Stable box ID/choice/duplicate retained; owner-box key; immutable insert; replay and partial retry tests. |
| 49 | MERGE: COLLECTIBLE FAVORITES | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Favorites accepted only for valid unlocked collectible after event replay; no fabricated unlock. |
| 50 | MERGE: DISPLAY NAME | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Cloud name wins; approved Guest name precedes provider; tested metadata fallback without Guest consent leak. |
| 51 | DO NOT DELETE GUEST DATA BEFORE SUCCESS | COMPLETE | COMPLETE | Guest never erased; confirmed operations acknowledged; failed remainder durable/retryable; merge-resume test. |
| 52 | LOCAL-FIRST SIGNED-IN EXPERIENCE | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Optimistic React/local update, per-operation durability, asynchronous cloud drain; no UI wait for repository. |
| 53 | DURABLE SYNC OUTBOX | COMPLETE | COMPLETE | Account-only durable outbox, validated records, receipt protection, deterministic order; concurrent-store regressions. |
| 54 | SYNC RETRY | PARTIAL | PARTIAL | Reconnect/boot/focus/manual retry and bounded 5/20/60s backoff exist; local-only changes unnecessarily hydrate cloud. |
| 55 | SYNC STATUS UI | COMPLETE | COMPLETE | SyncStatus exposes Guest/local, syncing/synced/offline/issue and Retry/Refresh; merge retry copy. |
| 56 | FAVORITE CONFLICT MODEL | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Mutable favorites server acceptance order wins via is_active and stamped updated_at; final documentation missing. |
| 57 | RECENT VIEW CONFLICT MODEL | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Atomic greatest RPC plus direct update trigger; mocked newer-cloud/older-pending regression passes. |
| 58 | MEAL EVENT IDEMPOTENCY | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Composite meal PK and ignoreDuplicates; callback/StrictMode/merge/network retries covered through mocks. |
| 59 | OPENED BOX IDEMPOTENCY | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Composite box PK and immutable ignoreDuplicates; original rewards preserved through retries/replay. |
| 60 | CLOUD REPOSITORY LAYER | COMPLETE | COMPLETE | cloudRepository owns reads/upserts/RPC, checks identity, paginates owned rows; no table calls scattered in JSX. |
| 61 | SYNC SERVICE LAYER | COMPLETE | COMPLETE | syncEngine owns queue/hydration/merge/status; cloudState adapters retain domain logic. |
| 62 | CROSS-DEVICE HYDRATION | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Fresh SDK/device hydration tested for all journey sections; genuine second-browser cloud validation blocked. |
| 63 | EXPERIENCE REHYDRATION | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | normalizeExperience replays logs/openings with existing reducer rules; duplicates/verification/box targets preserved. |
| 64 | LOCAL DAY SEMANTICS | COMPLETE | COMPLETE | Recorded local_day round trips as log.day; never reconstructed from a second device's timezone. |
| 65 | UNFINISHED VISIT DRAFTS | COMPLETE | COMPLETE | Unfinished drafts preserved in local identity cache; journeyMutations excludes them from cloud payload. |
| 66 | DISCOVERY SESSION | COMPLETE | COMPLETE | Discovery remains current craving, identity-local; four answers never queued or used as lasting taste profile. |
| 67 | NO LEARNED PERSONALIZATION YET | COMPLETE | COMPLETE | Recommendation engine inputs remain session/catalog; prior ranking/display/Surprise tests preserved. |
| 68 | FUTURE TASTE PROFILE | NOT IMPLEMENTED | NOT IMPLEMENTED | Brief Current Craving vs future Taste Profile documentation missing; no personalization code planned. |
| 69 | GOOGLE PLACES STORAGE RULE | COMPLETE | COMPLETE | Cloud payload allowlists carry only stable restaurant IDs/Nom fields; no reviews/photos/hours/Places response cache. |
| 70 | QA PLAYGROUNDS MUST NEVER SYNC | COMPLETE | COMPLETE | Memory-only QA contexts; authenticated mounted preview test asserts no cache/outbox/cloud/Places/network changes. |
| 71 | GOOGLE PLACES QA | COMPLETE | COMPLETE | Automated Places mocks and synthetic configuration; no quota changes or billable calls. |
| 72 | AUTH CALLBACK | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Callback code replay guard, success/provider/expired/missing code handling, safe return and consent boundary tests. |
| 73 | PASSWORD RESET | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Reset request/exchange/form/password update implemented; missing/expired and remount tested; submit QA incomplete. |
| 74 | SUPABASE AUTH URL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Real Site/redirect settings inaccessible; exact production/local/Preview setup docs still missing. |
| 75 | GOOGLE CLOUD OAUTH CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Google Web OAuth credentials/settings not available; exact setup sequence still missing. |
| 76 | USE EXISTING GOOGLE CLOUD PROJECT CAREFULLY | COMPLETE | COMPLETE | Places OAuth separation preserved; no Google key restrictions/project settings modified. |
| 77 | ACCOUNT DELETION | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | DELETE server endpoint resolves caller via getUser, deletes only caller, no target parameter; cloud cascade unexecuted. |
| 78 | ACCOUNT DELETION UI | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Server capability probe, DELETE confirmation, disabled unavailable state; frontend success/failure cleanup QA incomplete. |
| 79 | SECRET KEY SAFETY | COMPLETE | COMPLETE | Server-only secret configuration and compiled-source scanner; production assets now scanned; no credential disclosure. |
| 80 | VERCEL ENVIRONMENT VARIABLES | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Browser/server vars absent locally; real Production/Preview env settings unverified; Google semantics preserved. |
| 81 | ATTEMPT REAL SUPABASE MIGRATION | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Target hardcoded to Nom; Supabase connector unconnected/no CLI; remote schema/history cannot be inspected/applied. |
| 82 | DO NOT TOUCH OTHER SUPABASE PROJECTS | COMPLETE | COMPLETE | Nom allowlist in client/server and SQL comments; no other Supabase project accessed or modified. |
| 83 | APPLY MIGRATIONS SAFELY | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Migration has no destructive DROP; must inspect remote data/schema/history before any DDL; access blocked. |
| 84 | DATABASE TESTING | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Executable rollback SQL exists but no PostgreSQL/CLI/Docker or connected remote SQL; grants/cross-owner gaps inspected. |
| 85 | SECURITY ADVISORS | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | No authenticated remote advisor tooling; no unrelated managed objects modified. |
| 86 | ACCOUNT CACHE ISOLATION TEST | COMPLETE | COMPLETE | Store and mounted tests isolate G/A/G/B/G and Discovery/name/favorite state across signout/auth events. |
| 87 | GUEST MERGE TEST | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Representative store merge covers dish/restaurant/view/meal/feedback/opening/collectible/name, idempotency and replay. |
| 88 | ACCOUNT-ONLY TEST | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Account-only tests preserve Guest bytes and forbid Guest upload; mounted Profile signout restores Guest. |
| 89 | OFFLINE TEST | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | SDK-path optimistic offline cache/outbox/reload/flush tests pass; actual network/cloud test externally blocked. |
| 90 | RECENT VIEW TEST | COMPLETE BUT NOT LIVE-VALIDATED | COMPLETE BUT NOT LIVE-VALIDATED | Older pending view cannot replace newer fixture cloud timestamp; true SQL result not executed. |
| 91 | STRICTMODE TEST | COMPLETE | COMPLETE | StrictMode listeners/callback/merge flight/event keys covered; idempotent database contract still needs execution. |
| 92 | AUTH TESTS | COMPLETE | COMPLETE | Mock Auth tests cover Google/email/reset/update/signout/bootstrap/restoration/failure/concurrent callbacks. |
| 93 | APP TESTS | PARTIAL | PARTIAL | Existing app/domain/account tests extensive; additional form/deletion/cross-device UI verification needed. |
| 94 | CURRENT RECOMMENDATION TEST | COMPLETE | COMPLETE | DiscoveryCompatibility and scoring tests preserve Nasi Goreng 100 and single-flavor 85; no history ranking inputs. |
| 95 | CURRENT REGION FIGMA TEST | COMPLETE | COMPLETE | Region/MobileAcceptance regressions preserve eight vertical cards/two columns/full-width Surprise/natural scroll. |
| 96 | EXPERIENCE PLAYGROUND TEST | COMPLETE | COMPLETE | ExperiencePlayground mock journey works under isolated contexts; authenticated QA no real state mutation test. |
| 97 | REWARD PLAYGROUND TEST | COMPLETE | COMPLETE | RewardPlayground is build-flag gated, memory-only and tested; production override already implemented. |
| 98 | BUILD CONFIGURATIONS | PARTIAL | PARTIAL | Guest/normal production built; configured mocked runtime tested; dedicated QA Preview/production override builds pending. |
| 99 | FULL VALIDATION | PARTIAL | PARTIAL | 961/58 baseline green; final continuation suite/catalog/assets/build/security/package checks must be rerun. |
| 100 | DO NOT USE LIVE GOOGLE PLACES IN TESTS | COMPLETE | COMPLETE | No automated real Places requests; mocks, quota guards, restaurant integration unchanged. |
| 101 | README / SETUP DOCUMENTATION | NOT IMPLEMENTED | NOT IMPLEMENTED | docs/supabase-setup.md absent; must document exact project/env/migration/Auth/reset/Vercel/QA/deletion workflow. |
| 102 | IF SUPABASE MIGRATION APPLIED | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | No real migration applied/confirmed; cannot record a success/version without remote access. |
| 103 | IF SUPABASE MIGRATION FAILS | COMPLETE | COMPLETE | No remote DDL failure fabricated; environmental access failure recorded; local work continues. |
| 104 | RETRY PHILOSOPHY | COMPLETE | COMPLETE | Ordinary validation errors corrected/retried; no bypasses, credential fabrication, wrong-target writes or brute force. |
| 105 | VERCEL SETUP | BLOCKED BY EXTERNAL CONFIGURATION | BLOCKED BY EXTERNAL CONFIGURATION | Vercel integration unconnected; CLI identity check produces no authenticated identity; remote env not inspected. |
| 106 | DO NOT DEPLOY | COMPLETE | COMPLETE | No application commit/push/deploy/Preview promotion; review remains user-controlled. |
| 107 | FINAL MANUAL GOOGLE OAUTH CHECKLIST | NOT IMPLEMENTED | NOT IMPLEMENTED | Exact Google/Supabase manual checklist absent from requested final handoff. |
| 108 | FINAL CROSS-DEVICE QA CHECKLIST | NOT IMPLEMENTED | NOT IMPLEMENTED | Exact Device A/Device B and subsequent reconcile QA checklist not yet provided in requested handoff. |
| 109 | PRIVACY / ACCOUNT FOUNDATION | COMPLETE | COMPLETE | Profile/Account/privacy copy distinguishes local Guest from account sync without unsupported privacy guarantees. |
| 110 | ACCOUNT DELETION / LAUNCH READINESS | PARTIAL | PARTIAL | Deletion server missing secret honestly disabled; explicit launch-readiness/configuration documentation pending. |
| 111 | FUTURE PERSONALIZATION NOTES | NOT IMPLEMENTED | NOT IMPLEMENTED | Future signals/current-craving separation requires brief requested documentation; no learned model implemented. |
| 112 | FINAL REPORT | NOT IMPLEMENTED | NOT IMPLEMENTED | Requested final docs/supabase-account-sync-validation/report.md not previously present; matrix/handoff required. |
| 113 | FINAL RESPONSE | PARTIAL | PARTIAL | Final evidence/report follows completion of feasible local work; real DB/Auth results will be distinguished from mocks. |

## Continuation results

### October 6, 2026 — real connection and integration attempt

**Live integration remains BLOCKED.** The exact Nom project was verified, its public table list and migration history were inspected, and the existing migration was submitted once through the migration tool. Automatic approval checks rejected both raw SQL inspection and migration application: `MCP tool call requires approval, but approval policy is never`. The tool calls did not execute SQL. This is an execution-policy restriction, not a SQL/schema failure or a missing user authorization. No migration, account, remote data, Auth setting, Vercel variable, project, deployment, or Git commit was created or changed.

Before work, the current Git status/diff and the onboarding/stabilization reports were read, along with the complete 113-section original master specification. A SHA-256 inventory of 768 nonignored files was saved outside the repository at `/private/tmp/nom-integration-preservation.json`. Existing application work was preserved. No architecture was rebuilt and no application/test/SQL/dependency file was edited.

### Remote evidence and limits

- Supabase `get_project`: **Nom**, `iwamwxsosrhxsdcsuoiu`, `ACTIVE_HEALTHY`, `us-west-2`, organization `dzkeunqdfwlxjrfzwxgn`, Postgres 17.
- `list_migrations`: empty before the attempt and in the final recheck. The local migration `202610060001_nom_accounts.sql` is **not applied**.
- `list_tables(public, verbose=true)`: empty before the attempt and in the final recheck. All seven intended account tables are absent.
- Listing all schemas returned only Supabase-managed Auth/Storage/Realtime/Vault tables, with no reported application table or conflicting application data. The table listing reported zero rows for `auth.users`. This is table-list metadata, not an independently executed `COUNT(*)` or a full catalog inventory. Views, policy definitions, grants, triggers, and function definitions could not be independently inspected because SQL inspection was rejected.
- Security Advisor: two warnings on the existing `public.rls_auto_enable()` SECURITY DEFINER function, executable by `anon` and `authenticated`. It is not defined by the Nom migration and was left unchanged. See [anonymous execute remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated execute remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). This result is not a clean security pass.
- Performance Advisor: no findings. This is a pre-migration result; there are no Nom tables to evaluate yet.
- Vercel `get_project`: `nom`, ID `prj_LALXVSZJA3EAX7Kp4RUA1fICcyV6`, account `team_ely71EC4Ov5TDqgbqA0ZSXBc` (**Leng's projects**), includes `nom-coral.vercel.app`. The preceding read-only connection check also verified that domain as the project's production domain.
- Vercel environment metadata was read with decryption disabled; output was reduced to variable names and environments. No credentials were displayed or retrieved for testing.
- No connected Supabase tool exposes Auth configuration. Browser setup returned `No browser is available`; browser discovery returned `[]`. Email enablement/confirmation/SMTP, Google provider readiness, Site URL, redirect allowlist, and reset configuration remain unknown. Direct shell access to the Supabase hostname failed DNS resolution. No `psql`, PostgreSQL server, Supabase CLI, or Docker executable was available for an isolated SQL run.

### Requested final outcomes

PASS below refers to the stated evidence only. Every outcome requiring real Auth/database traffic remains BLOCKED; mocked tests are supporting local evidence, not an integration pass.

| # | Requested result | Status | Evidence / remaining requirement |
|---|---|---|---|
| 1 | Confirmed Supabase project | PASS | Connected metadata confirms Nom and exact allowed ref. |
| 2 | Remote migration state before work | PASS | Connected history returned no migrations. |
| 3 | Migration applied or not applied | BLOCKED | Existing migration application rejected; final history still empty. |
| 4 | Database tables verified | BLOCKED | None of profiles, dish_favorites, restaurant_favorites, recent_dish_views, meal_logs, opened_boxes, collectible_favorites exists remotely. |
| 5 | RLS results | BLOCKED | Existing `accounts_rls.sql` cannot run without SQL execution and schema. No actual allow/deny result claimed. |
| 6 | Grants | BLOCKED | Intended least-privilege grants exist in SQL; no account-table grants exist to verify remotely. |
| 7 | Security Advisor | FAIL | Two pre-existing execute warnings; unrelated function unchanged. No Nom objects introduced. |
| 8 | Performance Advisor | PASS | Live advisor returned no findings before migration. Post-migration rerun required. |
| 9 | Email/password Auth | BLOCKED | No real development users, credentials, delivery, provider settings, or signed-in session available. Existing SDK/UI mocks passed. |
| 10 | Google OAuth | BLOCKED | Actual provider configuration and Google credentials unknown; exact setup sequence in setup document. |
| 11 | Password reset/update | BLOCKED | Actual delivery/PKCE return untested; existing mounted form and SDK regressions passed locally. |
| 12 | Session restoration/signout | BLOCKED | Live session unavailable; local bootstrap, session, and signout regressions passed. |
| 13 | Profile persistence | BLOCKED | No remote profiles table or authenticated account. |
| 14 | Dish favorite sync | BLOCKED | No remote table; local tombstone, queue, retry, and hydration regressions passed. |
| 15 | Restaurant favorite sync | BLOCKED | No remote table; local payloads retain stable restaurant IDs without Places payloads. |
| 16 | Recent-view sync | BLOCKED | SQL/RPC newest-wins behavior not executed; existing local transport regressions passed. |
| 17 | Meal sync/idempotency | BLOCKED | No remote events; original-ID/local_day/retry tests passed locally. |
| 18 | Opened-box sync/idempotency | BLOCKED | No remote events; existing replay/idempotency regressions passed locally. |
| 19 | Collectible favorites | BLOCKED | Real relationships not tested; local normalization requires existing unlocks. |
| 20 | Guest/account cache isolation | BLOCKED | Real sign-in G→A→G→B→G unavailable; existing store/mounted identity isolation tests passed. |
| 21 | Merge & Sync | BLOCKED | Real writes unavailable; local explicit-consent/idempotence/recovery tests passed. |
| 22 | Use account data only | BLOCKED | Real signed-in account unavailable; existing tests preserve Guest bytes and prevent Guest upload. |
| 23 | Cross-device hydration | BLOCKED | Cannot create two independent authenticated real sessions; mocked transport checks are not a remote round trip. |
| 24 | Offline/outbox against real backend | BLOCKED | No real backend drain possible; local concurrent-store durability, acknowledgements, stale snapshots, and retry checks passed. |
| 25 | Experience replay | BLOCKED | No real cloud history to replay; local domain replay/local_day/reward consistency tests passed. |
| 26 | Demo-seed exclusion | BLOCKED | No real upload exercised; existing source/mutation/SQL safeguards and local tests remain intact. |
| 27 | QA isolation | BLOCKED | Existing authenticated mock QA tests passed with no network/cache/outbox changes. Preview artifacts include both playgrounds and production artifacts exclude both; no actual Supabase validation claimed. |
| 28 | Account deletion | BLOCKED | Missing server secret and live account/schema. Existing caller-only server and confirmed-success UI cleanup tests passed; no deletion fabricated. |
| 29 | Vercel env status | PASS | Metadata inspection completed; three Supabase variables missing everywhere. Availability table below. |
| 30 | Files changed in this pass | PASS | Only this report and `docs/supabase-setup.md`; ignored production output rebuilt. |
| 31 | Tests added/changed | NOT APPLICABLE | None. All tests and application/SQL files predate this pass. |
| 32 | Final test count | PASS | 971 Vitest tests / 58 files; embedded Python suites 16 and 40 passed. Ten more than the cited 961 baseline were already present; not added here. |
| 33 | Build | PASS | Guest/normal production, synthetic configured development, QA Preview, and production-with-QA-flag builds succeeded. Build success is not live Auth success. |
| 34 | Catalog/protected files | PASS | 201 unique dishes; workbook consistency, dependency and credential checks passed; preservation comparison below. |
| 35 | Remaining manual blockers | BLOCKED | Execution policy, unavailable Auth/browser access, absent account env and disposable sessions; exact sequence below. |
| 36 | Recommended next major phase | NOT APPLICABLE | First finish real account integration/launch validation, then browser/mobile product QA and content completion. No ML personalization introduced. |

### Environment availability (no values)

| Variable | Production | Preview | Development |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Missing | Missing | Missing |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Missing | Missing | Missing |
| `SUPABASE_SECRET_KEY` | Missing | Missing | Missing |
| `GOOGLE_PLACES_API_KEY` | Present | Present | Missing |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Present | Present | Missing |
| `VITE_GOOGLE_MAPS_MAP_ID` | Present | Present | Missing |
| `VITE_ENABLE_REWARD_QA` | Missing | Present | Missing |

Local Vite development and production environment inspection also reported all three account variables missing. No existing Google variable, quota, key restriction, or QA setting changed. Public account settings were not installed ahead of a usable backend; no private credentials were available or requested in chat.

### Final local validation

| Check | Result |
|---|---|
| `npm test` | 971/971 tests, 58/58 files; embedded Python 16 + 40 passed |
| `npm run build` | PASS, including catalog validation and source/emitted-bundle credential scanner |
| `npm run catalog:check` | PASS, 201 workbook records in order |
| `npm ls --depth=0` | PASS, existing dependencies unchanged |
| `node scripts/validate-account-secrets.mjs --dist` | PASS |
| `npm run ship -- --dry-run` | PASS; migration and both SQL test scripts included; no staging/commit/push |
| Configured development build | PASS with process-local synthetic public fixture, output only in `/private/tmp/nom-configured-build`; no runtime/backend traffic or stored env changes |
| QA Preview / production override builds | PASS in `/private/tmp/nom-qa-preview-build` and `/private/tmp/nom-qa-production-build`; both playground chunks present only in Preview |
| Additional temporary build inspection | No privileged literal/server-secret references in 62, 64, and 62 generated JS/HTML files respectively |
| `git diff --check` | PASS |
| Preservation inventory | Only the two documentation files changed; application, tests, migrations/SQL, dependencies, catalog, and assets retained |
| SQL/database tests | BLOCKED; both SQL scripts remain ready, not executed |

Diagnostics are outside the repository: `/private/tmp/nom-integration-tests.log`, `nom-integration-build.log`, `nom-integration-ship.log`, and temporary build logs/artifacts. HEAD remains `c7b834ce27c17d7e9c1825f096c4cf350caab837`; index remains unstaged.

### Exact remaining sequence

1. Use an execution context that permits the owner-authorized Supabase SQL and migration calls, or an authenticated operator CLI. Verify **Nom / iwamwxsosrhxsdcsuoiu** again. Inspect complete schema/history, policies/grants/functions/triggers and any current data; do not assume today's empty table list remains current. Inspect the existing `rls_auto_enable()` separately without blindly changing a managed object.
2. Apply only `supabase/migrations/202610060001_nom_accounts.sql` with the migration workflow after confirming no conflicts; record its version/history. Execute `accounts_schema.sql`, and execute rollback-based `accounts_rls.sql` in an authorized isolated Supabase-compatible database. Verify all seven tables, constraints/indexes/triggers/RPC, role grants, anonymous denial, A/B isolation, event immutability and deletion cascade. Rerun both advisors.
3. In Nom Authentication settings, inspect/enable email/password and record confirmation/SMTP/rate-limit settings. Set Site URL **https://nom-coral.vercel.app** and allow **https://nom-coral.vercel.app/auth/callback**, **https://nom-coral.vercel.app/account/reset-password**, **http://localhost:5173/auth/callback**, and **http://localhost:5173/account/reset-password**. Use exact trusted Preview hosts if needed. These expected values were not verified or saved here.
4. In the existing Google Cloud project, open Google Auth Platform; configure Branding/Audience/test users and identity scopes. Create/use a Web OAuth client with origins **https://nom-coral.vercel.app** and **http://localhost:5173**, and redirect **https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback**. Securely place its client ID/secret in **Nom Supabase → Authentication → Google provider**, enable it, then verify both callback hops with real sign-in. Leave Places/Maps keys/quotas unchanged. Full instructions and official sources are in [supabase-setup.md](../supabase-setup.md).
5. Securely obtain Nom's public URL/publishable key and configure ignored local env plus the intended existing Vercel scopes; configure `SUPABASE_SECRET_KEY` only server-side for deletion. Never create `VITE_SUPABASE_SECRET_KEY`. Vite's build-time public settings need a future owner-reviewed build; this run does not deploy.
6. With disposable real development accounts, exercise registration/confirmation, login, reset/update, session restoration/signout, caller-only deletion, all repository mutations, consent/account-only, A/B isolation, offline/retry and immutable reward replay. **Device A:** representative Guest journey → sign in → Merge & Sync → Synced. **Device B:** fresh browser storage → same account → verify favorites/history/progress/collections. Make another favorite/log change on A, refresh B, then test unfavorite and older offline view replay. Preserve Guest bytes and original event IDs/local_day. Verify QA makes no real writes and no Places requests. Do not call the local SDK tests a live pass.

No push, Vercel deploy/promotion, production publication, unrelated-project action, or new project creation occurred.
