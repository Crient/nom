# Nom account foundation checkpoint

Recommended commit: `feat: add Supabase accounts auth and cross-device sync`.

Owner approved this exact checkpoint, push to main, and its automatic Nom Production deployment on October 6, 2026. The recorded base inventory and exclusions below remain unchanged. Documentation now records the confirmed Production-only deletion credential and Git deployment controls; implementation hashes still match the passing baseline.

Branch: `main`. HEAD: `c7b834ce27c17d7e9c1825f096c4cf350caab837`. Index is empty; no commit, push, or deployment performed.

The selected source/test tree preserves the current reviewed working-tree behavior. It includes inherited recommendation compatibility/session and Region-layout edits already present before this pass because the authoritative 971-test baseline covers that same integrated tree. No new ranking, personalization, UI, catalog, Places, or schema change is introduced by this preparation. Splitting these existing changes without revalidating a different source tree would produce a different deployment candidate. Unrelated historical audit documents remain outside this checkpoint.

## Exact proposed files (84)

M = tracked modified file; A = new file. This is an explicit recommendation, not an executed staging command.

- M `.env.example`
- A `api/account.js`
- A `docs/account-stabilization-validation/report.md`
- A `docs/supabase-account-sync-validation/checkpoint.md`
- A `docs/supabase-account-sync-validation/report.md`
- A `docs/supabase-setup.md`
- M `package-lock.json`
- M `package.json`
- A `scripts/accountSecrets.test.js`
- M `scripts/ship.sh`
- A `scripts/ship.test.js`
- A `scripts/validate-account-secrets.mjs`
- A `scripts/validate-live-accounts.mjs`
- A `server/accountHandler.js`
- A `server/accountHandler.test.js`
- A `server/accountSchema.test.js`
- M `src/App.jsx`
- M `src/App.test.jsx`
- A `src/components/account/GuestMigration.jsx`
- A `src/components/account/SyncStatus.jsx`
- M `src/components/discovery/RegionCard.jsx`
- M `src/components/experience/EdgeStateModal.jsx`
- M `src/components/recommendations/BestMatchCard.jsx`
- M `src/components/recommendations/DishDetailHero.jsx`
- M `src/components/recommendations/RecommendationCard.jsx`
- M `src/context/Activity.jsx`
- A `src/context/Auth.jsx`
- A `src/context/Auth.test.jsx`
- M `src/context/DiscoverySession.jsx`
- M `src/context/Experience.jsx`
- A `src/context/ExperienceFlow.jsx`
- M `src/context/Favorites.jsx`
- A `src/context/LocalData.jsx`
- A `src/data/accountOutbox.js`
- A `src/data/accountSync.test.js`
- A `src/data/cloudRepository.js`
- A `src/data/cloudState.js`
- M `src/data/experienceState.js`
- A `src/data/identityStorage.js`
- M `src/data/localPersistence.js`
- M `src/data/persistedState.js`
- A `src/data/syncEngine.js`
- M `src/hooks/useDiscoveryNavigation.js`
- M `src/hooks/useRestaurant.js`
- A `src/lib/supabaseClient.js`
- A `src/pages/Account.jsx`
- A `src/pages/AccountFlows.test.jsx`
- A `src/pages/AuthCallback.jsx`
- A `src/pages/DiscoveryCompatibility.test.jsx`
- M `src/pages/DishDetails.test.jsx`
- M `src/pages/ExperienceFlow.test.jsx`
- M `src/pages/ExperienceLogged.jsx`
- A `src/pages/ExperiencePlayground.jsx`
- A `src/pages/ExperiencePlayground.test.jsx`
- M `src/pages/Home.jsx`
- M `src/pages/MealFeedback.jsx`
- M `src/pages/MobileAcceptance.test.jsx`
- M `src/pages/MoreOptions.test.jsx`
- M `src/pages/NearbyRestaurants.jsx`
- M `src/pages/PlacesPolicy.jsx`
- M `src/pages/Profile.jsx`
- M `src/pages/RecommendationIdentity.test.jsx`
- A `src/pages/ResetPassword.jsx`
- M `src/pages/RestaurantDetails.jsx`
- M `src/pages/SurpriseBox.jsx`
- M `src/pages/VerifyVisit.jsx`
- M `src/pages/Welcome.jsx`
- M `src/routes.jsx`
- A `src/styles/account.css`
- M `src/styles/discovery.css`
- A `src/test/accountFixtures.js`
- M `src/test/setup.js`
- A `src/utils/accountNavigation.js`
- A `src/utils/matchCompatibility.test.js`
- M `src/utils/moreOptions.test.js`
- M `src/utils/recommendationAudit.test.js`
- M `src/utils/recommendationEngine.js`
- M `src/utils/surpriseSession.js`
- M `src/utils/whyMatched.js`
- M `src/utils/whyMatched.test.js`
- A `supabase/migrations/202610060001_nom_accounts.sql`
- A `supabase/tests/accounts_rls.sql`
- A `supabase/tests/accounts_schema.sql`
- M `vite.config.js`

## Intentionally excluded untracked files (15)

Preserved on disk; neither deleted nor staged.

- `docs/engineering-onboarding-validation/report.md`
- `docs/figma-scoring-experience-validation/report.md`
- `docs/final-visual-state-validation/README.md`
- `docs/final-visual-state-validation/asset-audit.md`
- `docs/nearby-restaurants-google-places.md`
- `docs/nearby-restaurants-phase2-validation.json`
- `docs/nearby-restaurants-ux-correction-validation.json`
- `docs/nearby-restaurants-ux-correction-validation/visual-code-review.md`
- `docs/nearby-restaurants-validation.json`
- `docs/overnight-product-polish.md`
- `docs/product-polish-followup.md`
- `docs/product-polish-v3.md`
- `docs/targeted-runtime-motion-validation/report.md`
- `docs/ui-polish-five-validation/report.md`
- `src/assets/food/generated-incoming/.gitkeep`

## Generated, credential, and temporary exclusions

- `.env.local`: existing ignored Google configuration; never stage or print values. `.env.example` is the only env template in the manifest and contains placeholders only.
- `dist/`, `node_modules/`, `.vite/`, existing ignored image/cache/QA directories, and ignored validation JSON/log/PNG/TXT evidence are not part of the checkpoint.
- `/private/tmp/nom-live-*`, `/private/tmp/nom-email-*`, `/private/tmp/nom-deployed-*`, and `/private/tmp/nom-predeploy-*` are outside the repository. No candidate symlink points at them. The opt-in repository runner `scripts/validate-live-accounts.mjs` is legitimate source, not an executed fixture or embedded credential.
- No new screenshot, browser state, HAR, credential export, generated dish image, or real env file is selected.

## Safety and approval boundaries

Security inventory found no literal Google OAuth client secret, Supabase secret/service-role key, private key, GitHub token, or Google access token in tracked or candidate text files; synthetic tests and server env references remain legitimate. No deletions or staged paths exist. Full final validation results and implementation coverage are in `report.md`.

The server deletion credential is still required in Vercel Production. Google secret rotation is a separate hardening item requiring owner approval; the screenshot-exposed value must not be copied into the repository.

GitHub connection `Crient/nom` is verified. The current production build came from `main`; exact current Production Branch/automatic-deployment/Preview settings are not exposed by the connector, and CLI authentication is absent. Until read-only dashboard confirmation, treat a `main` push as potentially deploying Production. Do not commit until the owner approves this manifest; do not push/deploy without the corresponding immediate approval. Never use non-dry-run `npm run ship` merely to commit because it also pushes.

The existing catalog source/assets are already tracked and unchanged; they need no new staging. All seven-table live persistence/RLS results remain authoritative and are not rerun in this preparation.
