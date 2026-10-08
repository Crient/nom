# Restored working-tree inventory before targeted fixes

49 tracked modifications; 56 new/untracked files; nothing staged. HEAD/main: c13329e86e89b17dfcf78b2815557b37ce04703c. All 811 files match the saved pre-polish baseline.

## Exact Git status

```text
 M .gitignore
 M docs/supabase-account-sync-validation/report.md
 M package-lock.json
 M package.json
 M scripts/accountSecrets.test.js
 M scripts/validate-account-secrets.mjs
 M src/components/experience/EdgeStateModal.jsx
 M src/components/recommendations/DishDetailHero.jsx
 M src/components/restaurants/LiveRestaurantDetails.jsx
 M src/data/accountSync.test.js
 M src/data/cloudRepository.js
 M src/data/cloudState.js
 M src/data/collectionDefinitions.js
 M src/data/experienceState.js
 M src/data/experienceState.test.js
 M src/data/localPersistence.test.js
 M src/data/persistedState.js
 M src/data/syncEngine.js
 M src/data/visitVerificationProvider.js
 M src/pages/AccountFlows.test.jsx
 M src/pages/AppDestinations.test.jsx
 M src/pages/DishDetails.jsx
 M src/pages/ExperienceFlow.test.jsx
 M src/pages/ExperiencePlayground.jsx
 M src/pages/ExperiencePlayground.test.jsx
 M src/pages/Home.jsx
 M src/pages/LiveNearbyRestaurants.test.jsx
 M src/pages/MealFeedback.jsx
 M src/pages/NearbyRestaurants.jsx
 M src/pages/PlacesPolicy.jsx
 M src/pages/ProductionAudit.test.jsx
 M src/pages/Profile.jsx
 M src/pages/Progress.jsx
 M src/pages/RestaurantDetails.jsx
 M src/pages/RewardPlayground.test.jsx
 M src/pages/SurpriseBox.jsx
 M src/pages/SurpriseBox.test.jsx
 M src/pages/SurpriseMe.jsx
 M src/pages/VerifyVisit.jsx
 M src/pages/VisualStatePolish.test.jsx
 M src/pages/Welcome.jsx
 M src/styles/experience.css
 M src/test/accountFixtures.js
 M src/test/setup.js
 M src/utils/explorationSummary.js
 M src/utils/rewardSound.js
 M src/utils/rewardSound.test.js
 M vercel.json
 M vite.config.js
?? api/visit-verification.js
?? docs/auth-branding-validation/report.md
?? docs/engineering-onboarding-validation/report.md
?? docs/figma-scoring-experience-validation/report.md
?? docs/final-visual-state-validation/README.md
?? docs/final-visual-state-validation/asset-audit.md
?? docs/nearby-restaurants-google-places.md
?? docs/nearby-restaurants-phase2-validation.json
?? docs/nearby-restaurants-ux-correction-validation.json
?? docs/nearby-restaurants-ux-correction-validation/visual-code-review.md
?? docs/nearby-restaurants-validation.json
?? docs/onboarding-guest-surprise-validation/report.md
?? docs/overnight-product-polish.md
?? docs/product-polish-followup.md
?? docs/product-polish-v3.md
?? docs/targeted-runtime-motion-validation/report.md
?? docs/ui-polish-five-validation/report.md
?? docs/visit-verification-validation/report.md
?? server/receiptOcrProvider.js
?? server/restaurantQr.js
?? server/verificationDatabase.test.js
?? server/verificationPolicy.js
?? server/verificationRepository.js
?? server/verificationRestaurantProvider.js
?? server/verificationSignature.js
?? server/visitVerification.test.js
?? server/visitVerificationHandler.js
?? shared/visitVerification.js
?? src/assets/food/generated-incoming/.gitkeep
?? src/components/experience/RestaurantQrScanner.jsx
?? src/data/liveVisitVerification.js
?? src/data/verificationPersistence.test.js
?? src/hooks/useDishRecommendation.js
?? src/pages/GuestOnboarding.test.jsx
?? src/test/earnedJourney.js
?? src/test/verificationFixtures.js
?? src/utils/surpriseStrategy.js
?? src/utils/surpriseStrategy.test.js
?? supabase/auth-email-templates/README.md
?? supabase/auth-email-templates/config-patch.json
?? supabase/auth-email-templates/confirmation.html
?? supabase/auth-email-templates/email-change.html
?? supabase/auth-email-templates/email-changed-notification.html
?? supabase/auth-email-templates/identity-linked-notification.html
?? supabase/auth-email-templates/identity-unlinked-notification.html
?? supabase/auth-email-templates/invite.html
?? supabase/auth-email-templates/magic-link.html
?? supabase/auth-email-templates/mfa-factor-enrolled-notification.html
?? supabase/auth-email-templates/mfa-factor-unenrolled-notification.html
?? supabase/auth-email-templates/password-changed-notification.html
?? supabase/auth-email-templates/phone-changed-notification.html
?? supabase/auth-email-templates/reauthentication.html
?? supabase/auth-email-templates/recovery.html
?? supabase/auth-email-templates/subjects.json
?? supabase/auth-email-templates/templates.test.js
?? supabase/migrations/20261006234854_nom_visit_verification.sql
```

## Guest/onboarding

- M `src/data/collectionDefinitions.js`
- M `src/pages/Home.jsx`
- M `src/pages/Profile.jsx`
- M `src/pages/Welcome.jsx`

## Surprise Me

- M `src/components/recommendations/DishDetailHero.jsx`
- M `src/components/restaurants/LiveRestaurantDetails.jsx`
- M `src/pages/DishDetails.jsx`
- M `src/pages/NearbyRestaurants.jsx`
- M `src/pages/RestaurantDetails.jsx`
- M `src/pages/SurpriseMe.jsx`
- NEW `src/hooks/useDishRecommendation.js`
- NEW `src/utils/surpriseStrategy.js`

## Mystery Box/audio

- M `src/pages/SurpriseBox.jsx`
- M `src/utils/rewardSound.js`

## visit verification

- M `scripts/validate-account-secrets.mjs`
- M `src/components/experience/EdgeStateModal.jsx`
- M `src/data/cloudRepository.js`
- M `src/data/cloudState.js`
- M `src/data/experienceState.js`
- M `src/data/persistedState.js`
- M `src/data/syncEngine.js`
- M `src/data/visitVerificationProvider.js`
- M `src/pages/ExperiencePlayground.jsx`
- M `src/pages/MealFeedback.jsx`
- M `src/pages/PlacesPolicy.jsx`
- M `src/pages/Progress.jsx`
- M `src/pages/VerifyVisit.jsx`
- M `src/styles/experience.css`
- M `src/utils/explorationSummary.js`
- M `vercel.json`
- M `vite.config.js`
- NEW `api/visit-verification.js`
- NEW `server/receiptOcrProvider.js`
- NEW `server/restaurantQr.js`
- NEW `server/verificationPolicy.js`
- NEW `server/verificationRepository.js`
- NEW `server/verificationRestaurantProvider.js`
- NEW `server/verificationSignature.js`
- NEW `server/visitVerificationHandler.js`
- NEW `shared/visitVerification.js`
- NEW `src/components/experience/RestaurantQrScanner.jsx`
- NEW `src/data/liveVisitVerification.js`

## auth/account branding

- NEW `supabase/auth-email-templates/README.md`
- NEW `supabase/auth-email-templates/config-patch.json`
- NEW `supabase/auth-email-templates/confirmation.html`
- NEW `supabase/auth-email-templates/email-change.html`
- NEW `supabase/auth-email-templates/email-changed-notification.html`
- NEW `supabase/auth-email-templates/identity-linked-notification.html`
- NEW `supabase/auth-email-templates/identity-unlinked-notification.html`
- NEW `supabase/auth-email-templates/invite.html`
- NEW `supabase/auth-email-templates/magic-link.html`
- NEW `supabase/auth-email-templates/mfa-factor-enrolled-notification.html`
- NEW `supabase/auth-email-templates/mfa-factor-unenrolled-notification.html`
- NEW `supabase/auth-email-templates/password-changed-notification.html`
- NEW `supabase/auth-email-templates/phone-changed-notification.html`
- NEW `supabase/auth-email-templates/reauthentication.html`
- NEW `supabase/auth-email-templates/recovery.html`
- NEW `supabase/auth-email-templates/subjects.json`

## Supabase/database migration

- NEW `supabase/migrations/20261006234854_nom_visit_verification.sql`

## tests

- M `scripts/accountSecrets.test.js`
- M `src/data/accountSync.test.js`
- M `src/data/experienceState.test.js`
- M `src/data/localPersistence.test.js`
- M `src/pages/AccountFlows.test.jsx`
- M `src/pages/AppDestinations.test.jsx`
- M `src/pages/ExperienceFlow.test.jsx`
- M `src/pages/ExperiencePlayground.test.jsx`
- M `src/pages/LiveNearbyRestaurants.test.jsx`
- M `src/pages/ProductionAudit.test.jsx`
- M `src/pages/RewardPlayground.test.jsx`
- M `src/pages/SurpriseBox.test.jsx`
- M `src/pages/VisualStatePolish.test.jsx`
- M `src/test/accountFixtures.js`
- M `src/test/setup.js`
- M `src/utils/rewardSound.test.js`
- NEW `server/verificationDatabase.test.js`
- NEW `server/visitVerification.test.js`
- NEW `src/data/verificationPersistence.test.js`
- NEW `src/pages/GuestOnboarding.test.jsx`
- NEW `src/test/earnedJourney.js`
- NEW `src/test/verificationFixtures.js`
- NEW `src/utils/surpriseStrategy.test.js`
- NEW `supabase/auth-email-templates/templates.test.js`

## docs

- M `docs/supabase-account-sync-validation/report.md`
- NEW `docs/auth-branding-validation/report.md`
- NEW `docs/engineering-onboarding-validation/report.md`
- NEW `docs/figma-scoring-experience-validation/report.md`
- NEW `docs/final-visual-state-validation/README.md`
- NEW `docs/final-visual-state-validation/asset-audit.md`
- NEW `docs/nearby-restaurants-google-places.md`
- NEW `docs/nearby-restaurants-phase2-validation.json`
- NEW `docs/nearby-restaurants-ux-correction-validation.json`
- NEW `docs/nearby-restaurants-ux-correction-validation/visual-code-review.md`
- NEW `docs/nearby-restaurants-validation.json`
- NEW `docs/onboarding-guest-surprise-validation/report.md`
- NEW `docs/overnight-product-polish.md`
- NEW `docs/product-polish-followup.md`
- NEW `docs/product-polish-v3.md`
- NEW `docs/targeted-runtime-motion-validation/report.md`
- NEW `docs/ui-polish-five-validation/report.md`
- NEW `docs/visit-verification-validation/report.md`

## other

- M `.gitignore`
- M `package-lock.json`
- M `package.json`
- NEW `src/assets/food/generated-incoming/.gitkeep`

## Review flags

No leftover source files from the rejected broad pass. README.md and docs/final-product-polish plus ConnectivityNotice/JourneyLoading/NotFound/ProductPolish tests are absent. Original Home progress/icon cards and restaurant actions are intact. AppShell/global/hubs/navigation are restored.

Older docs named product-polish/overnight/final-visual-state predate the rejected pass and describe earlier requested work; preserve them as historical evidence rather than deleting by filename. Reports have historical counts and release IDs; do not treat them as fresh live verification.

The generated-incoming/.gitkeep is an empty intentional directory placeholder, not an image or disposable fixture. src/test/earnedJourney.js, verificationFixtures.js, accountFixtures.js and verification tests are controlled test-only fixtures, not production seeds; no runtime source imports them. Retain with tests.

Exclude ignored .env/.env.local, node_modules, dist, supabase/.temp, private temporary scripts, browser screenshots and disposable credentials. None are listed in current status. Do not stage broad directories blindly.

Verification migration has not been approved/applied remotely. It adds ledger/budget/redemption tables and meal metadata and tightens triggers/RPCs. It reclassifies legacy simulated meals as unverified and is not a fully backward-compatible drop-in for the existing production client. Preserve existing histories; coordinate migration and client rollout after approval.

## Suggested later commit plan

1. Focused Guest/onboarding, Surprise deck and status/search fixes with their tests.
2. Existing Mystery Box/audio changes and associated tests.
3. Verification backend/client, local migration, dependencies/security/config, fixtures and tests as a coherent unit after migration review.
4. Auth branding templates and truthful validation documentation; no automatic remote installation.
5. Review older historical docs for inclusion; retain them locally meanwhile.

Local review is safe. Live verification success still requires the reviewed database migration and local server configuration; no live success is inferred.
