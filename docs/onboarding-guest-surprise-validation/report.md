# Nom onboarding, Guest, Surprise Me and reward interaction validation

Prepared October 6, 2026 from the current working tree. **Ready for local review; not deployed.** No commit, push, remote configuration/schema write, Auth email or Supabase data operation was performed. HEAD remains `c13329e86e89b17dfcf78b2815557b37ce04703c`. Existing uncommitted visit verification, Auth, account sync, migrations and reports are preserved.

## Root causes and changes

The current production source initializes Experience from Figma demonstration values (`seedMeals`, `seedProgress`, `seedUnlocked`), including Cambodia's 17 meals and five starter unlocks. This is a default-state problem, rather than evidence of account data leaking into Guest. The existing local verification work already removes those seeds: fresh defaults are empty, and real rewards derive from signed verification events. This pass preserves that implementation and adds explicit fresh-profile coverage. Existing normalizers retain actual history/feedback, downgrade old simulated verification and exclude QA/demo reward evidence.

Welcome now offers **Continue as Guest** and **Sign in or create account**, with device-local versus cross-device helper text. The account choice uses the existing Google/email account UI. An already restored account sees **Continue to Home** / **Your Profile**, rather than a misleading Guest label. Home identifies Guest / Local Explorer or Nom account without an auth banner. Profile shows Guest / Local Explorer, device-local progress, or account email/provider and sync status.

Owned collectibles now have their own count. Progress separately labels the 48-item collectible catalog; Profile labels owned collectibles and collectible favorites. Catalog capacity is never presented as an earned total.

Home's **Let’s Eat** link was already correctly routed to Food Type in the current tree. It remains unchanged; the full four-step journey is now explicitly tested for fresh Guest, returning Guest and signed-in accounts.

Home's old Surprise action overwrote three discovery answers and sent users with no flavors to the Flavor questionnaire. It now selects immediately from all 201 canonical production dishes and opens that dish with a durable `?surprise=1` marker. The marker survives reload and nearby restaurant navigation, including restaurant-to-verification Back. No answer is invented, reset or required. Random results show a truthful Random surprise label, rather than a fabricated preference-match percentage. More Options opens the random swipe deck, which also supports empty discovery answers; normal preference-ranked recommendations remain unchanged.

`src/utils/surpriseStrategy.js` exposes the `randomV1` strategy and `chooseSurprise({strategy, avoidId, random, signals})` boundary. Each eligible dish gets an equal selection interval; the last actually viewed dish is excluded when alternatives exist. There is no Cambodia preference or QA catalog. The swipe deck samples equal-weight canonical results without replacement and scopes its ephemeral context/undo stack to the current identity. A replacement strategy's output is resolved back to a canonical catalog record; unknown/QA IDs cannot become a result.

Reward sound used to default off and delay its first note until the reward reveal. It now defaults on unless `off` was explicitly saved and schedules its first note at the Open gesture, with the opening animation. Loading/reloading a box does not autoplay. Muting stops playback; enabling during opening/reveal retriggers the chime, and reveal offers **Replay sound**. Browser refusal remains nonblocking, including asynchronous resume failure. Existing reduced-motion behavior still suppresses sound with an explicit notice. Audio does not change grant timing, signed-event eligibility, opening guards or idempotency.

## Validation results

| Flow / check | Status | Evidence and scope |
|---|---|---|
| Explicit Guest and optional account entry | PASS | Automated route tests and isolated Chromium; original account UI retained. |
| Fresh Guest zero earned state | PASS | Zero meals/views/countries/favorites/owned collectibles, empty logs/history, no available boxes; automation and empty Chromium profiles. |
| Returning legitimate Guest | PASS | Signed earned-event fixtures and actual browser views survive reload. Exploration alone grants no meal/reward. |
| Guest/account separation | PASS | Account hydration/use-account-only/signout restore separate Guest history and rewards; full account/sync regression suite. SDK transport is mocked, not a new live RLS audit. |
| Let’s Eat | PASS | All four normal questions and three recommendations for fresh/returning Guest and account; actual Chromium Guest journey. |
| Immediate Surprise Me | PASS | Fresh Guest/account route tests, canonical results, unchanged preferences, no four-question flow, reload and nearby compatibility. |
| Random eligibility / repeat avoidance | PASS | Deterministic selection-interval test reaches all 201 records and all countries; exclusion test reaches every alternative; browser consecutive draws differ. |
| Swipe deck / ordinary recommendations | PASS | Skip/undo/focus/card continuity and unchanged normal recommendation results; existing engine/catalog regressions pass. |
| Open gesture / actual audio timing | PASS | Real Chromium Web Audio oscillator starts at currentTime; no audio before Open; default-on, explicit-mute and blocked-storage preference tests. |
| Late unmute / replay / unavailable audio | PASS | Browser replay/unmute and automated refusal/resume rejection; visual sequence and grant remain independent. |
| Reward integrity | PASS | Signed fixture eligibility; empty Guest cannot open a fake box; rapid taps, refresh/retry, duplicate collectibles, reduced motion and sound replay cannot regrant. |
| QA isolation | PASS | Existing isolated playground/persistence and Production build flag tests; no fabricated Guest state added. |
| Auth / Places / server credential boundaries | PASS | Full existing tests and source/client-asset scan; no credential/configuration change or live service mutation. |
| Mobile entry | PASS | Chromium at 320/390/440px has no horizontal overflow; welcome composition inspected at 390px. |
| Full tests | PASS | 1,048 Vitest tests / 64 files, plus embedded Python suites of 16 and 40 checks. |
| Build / catalog / workbook | PASS | `npm run build`, catalog validator and `npm run catalog:check`; exactly 201 unique canonical dishes. |
| Security / packages | PASS | Account credential source/generated-asset checks, `git diff --check`, `npm audit`: zero vulnerabilities. |
| Production deployment of this pass | NOT RUN | Out of scope: the user requested local review only. No commit, push or deployment. |

Browser validation used new isolated Chromium contexts, localhost only, synthetic signed proof fixtures and intercepted API transport. No personal browser/account, real Supabase data, remote Maps calls or new emails were used. Browser scripts, screenshots and results stay under `/private/tmp`, outside the repository. There were zero page errors. Live verification rollout dependencies remain documented in `docs/visit-verification-validation/report.md`; this pass neither resolves nor changes those external dependencies.

## Future personalization extension (documentation only)

A future strategy can rank the same eligible canonical candidates using saved dishes, completed meals, ratings/reactions, feedback descriptors, cuisine/region history and recent exploration. It should balance predicted interest with novelty, keep immediate-repeat exclusion, and handle absent/offline signals by falling back to randomV1. Signals must come only from the active Guest/account scope. Keep deterministic recommendation scoring independent of Surprise selection, and provide the random deck with the replacement strategy's canonical result pool if that experience is personalized too. No ML model, telemetry pipeline, new account schema or personalization inference is implemented here.
