# Discovery, Why Matched and reward QA final fix

Applied locally against `fa08c0018c912f67f32134343b704d8cab70eef2` with one root agent. No deployment, Vercel environment modification, or live billable Google request was made.

**1. Discovery CSS strategy**

The page retains `min-height:100dvh` and its real bottom safe inset. The options region now uses `flex:1 0 auto`, intrinsic grid rows and `align-content:center`. It receives the available height and distributes spare space above and below the rows. Cards keep comfortable minimums rather than shrinking to force a fit. The fixed 956px/1150px canvases remain removed. Short screens and larger text can grow the document and scroll naturally.

Question separation is 10–16px, subtitle separation is 8px, and the options region has 16–24px minimum separation from the subtitle and CTA. Existing safe-area/header policy is unchanged.

**2. Food / Flavor dimensions and row spacing**

Tile minimum height is `clamp(104px,15dvh,125px)`, with artwork `clamp(52px,8dvh,64px)`. Tiles have 8px vertical padding and an 8px art/label gap. Row separation is `clamp(10px,1.6dvh,16px)`. The option grid's flexible height supplies additional balanced space around the tile group. Selected badges, borders, artwork crops and labels are unchanged.

**3. Adventure spacing**

Row minimum height is `clamp(84px,11.8dvh,100px)`, with 60–76px icons, 8px copy padding and a 5px title/subtitle gap. Rows use the same 10–16px separation and flexible centered options region as Food/Flavor. Choices and selection behavior are unchanged.

**4. Region compact-layout changes**

The entire `max-height:1000px` mode with 64px cards, 24px art, 16px checks and 4px row gaps is removed.

Region now uses a moderate layout at every phone height: 78–88px card minimums, 38–46px art, 8–12px row separation, 6px vertical padding, and 16–17px titles. Country examples keep their existing 12px type with a more relaxed 16px line height and span the full card width. Intrinsic text wrapping can make a card taller than its minimum; it is not clipped.

The original approximately 23px selected check is restored, with 26px title clearance in both states. The distinct Surprise Me row gets an additional 4px separation and a 78–92px minimum. Its art is 60–80px, and its existing 38px indicator reservation and selection behavior are unchanged.

**5. Continue behavior**

Continue remains a real button after the options in document flow. Its minimum height is 60–72px, and it retains the existing horizontal gutter and bottom safe-area clearance. Its auto top margin is removed. The options region owns the flexible space, so both sides of the choices receive breathing room while Continue stays toward the bottom on screens with sufficient space. On short viewports, natural scrolling preserves the hierarchy and touch targets.

Automated tests verify ordering, selection-enabled behavior and keyboard focus on all four steps. They do not establish rendered Safari fit.

**6. Why Matched star color**

Added stars now use `--why-star-color:#CDF4F2`, matching the original `detail-ai.svg` star strokes. Both star groups share a subtle shadow for definition. Their pale-aqua base color remains consistent while opacity varies for depth. The protected SVG is unchanged.

**7. Why Matched entrance timeline**

The one-shot entrance lasts 3000ms and starts when at least 60% of the card is visible. The observer callback checks the actual intersection ratio, so an initial partially intersecting callback does not start it too early. It disconnects after entry, and changing explanation text does not replay the sequence.

| Time | Presentation |
|---|---|
| 0–0.4s | Aqua border and inset light brighten gently |
| 0.3–1.5s | Strong diagonal glossy sweep crosses behind the text |
| 0.7–2.4s | Original large stars pulse once |
| 0.7–2.7s | Small pale-aqua stars twinkle and rise slightly on staggered timings |
| 1.4–2.8s | Softer second sheen pass |
| About 3s | Edge light settles into the static premium border/depth |

The text remains above the sheen. There is no continuous shimmer, shaking, rainbow effect or rapid strobe. Card radius, gradients and static depth remain crisp. Both the reduced-motion media query and the component's reduced-motion state disable the animated card, stars and sheen, leaving the finished static styling.

**8. Profile Reward Playground visibility**

Profile now renders Developer tools and its tappable Reward playground link using `rewardQaEnabled()` alone. The `import.meta.env.DEV` condition is removed. A flagged Vercel Preview therefore shows the entry even though it is built with `DEV=false`. The same entry works in flagged local development.

Tests exercise actual Profile → Reward Playground navigation with both DEV values and confirm the preview does not change persisted Experience state. All existing country, rarity, replay, reveal, reset, sound and motion controls are preserved.

**9. Production safeguard**

`vite.config.js` is unchanged and still forces the QA flag to false when `VERCEL_ENV=production`. The QA helper and route gate are unchanged. Production builds register no `/dev/rewards` route, include no RewardPlayground chunk, and compile Profile's QA guard to literal false. Query strings and localStorage cannot enable the feature.

The build check examines the route registration and compiled guard rather than treating an inert URL string as an enabled route. Default production, flagged Preview, and deliberately flagged Vercel Production builds all passed their expected states: [qa-build-checks.json](qa-build-checks.json).

**10. Exact Preview QA access**

Set this public build flag in the Nom project's Vercel **Preview environment only**:

```text
VITE_ENABLE_REWARD_QA=true
```

Leave Production unconfigured. Build a new Preview deployment with this change, then open **Profile → Developer tools → Reward playground**. The route remains **`/dev/rewards`**. No meals need to be earned to use it. Changing a build flag requires a new deployment/build; existing deployments retain their built configuration.

Local development can use:

```sh
VITE_ENABLE_REWARD_QA=true npm run dev
```

The playground continues to use its isolated memory-only context. Its presentation, grant isolation and audio code were not changed in this task.

**11. Files changed**

Exactly seven implementation/test files changed:

- `src/styles/discovery.css`
- `src/styles/recommendations.css`
- `src/components/recommendations/WhyMatchedCard.jsx`
- `src/pages/Profile.jsx`
- `src/pages/MobileAcceptance.test.jsx`
- `src/pages/ProductionAudit.test.jsx`
- `src/pages/RewardPlayground.test.jsx`

[Machine-readable list](changed-files.json). Validation artifacts are in this directory. Existing unrelated untracked files were preserved.

**12. Tests passed**

Focused run: **72 tests across 6 files passed**. Full `npm test`: **844 tests across 48 files passed**.

Coverage includes restored card/art/spacing minimums, flexible option distribution, all four accessible CTAs, Region check clearance, consistent stars, three-second bounded animation, delayed viewport entry, static reduced motion, Preview Profile access with DEV=false, disabled QA despite query/storage switches, and preview state/persistence isolation. Existing Mystery Box, sound, recommendation identity and nearby regressions passed.

[Focused test log](focused-tests.log), [full test log](full-tests.log).

**13. Build / catalog / protected-file results**

`npm run build` and its catalog validation passed. `npm run catalog:check` passed with **201 unique dishes**, retaining spreadsheet order. The flagged Preview and deliberately flagged Vercel Production builds also passed. `git diff --check` passed.

**717 protected files are byte-identical** to the before-pass baseline. Protection covers source outside the seven touched files, catalog, server/API code, existing assets, reward presentation/audio, Experience logic and persistence, safe-area/Search/navigation styles, and the Vite production guard.

[Production build](production-build.log), [catalog check](catalog-check.log), [Preview build](qa-preview-build.log), [Production safeguard build](qa-production-build.log), [protected results](protected-results.json).

**14. Remaining iPhone Safari visual QA**

Browser verification was unavailable: the browser runtime reported no browser and an empty session list; the production reference was also inaccessible through the web reader. No native Safari screenshot, rendered-fit or listening verification is claimed.

At normal 100% Safari page zoom, verify:

1. Food Type vertical rhythm.
2. Flavor vertical rhythm.
3. Adventure vertical rhythm.
4. Region vertical rhythm and recognizable artwork.
5. Continue visibility with toolbars expanded/collapsed, plus natural scrolling on short screens and larger text.
6. Why Matched's approximately three-second entrance, pale-aqua stars and static reduced motion.
7. Profile → Reward Playground on the flagged Vercel Preview.
8. Common reward.
9. Rare reward.
10. Epic reward.
11. Legendary reward.
12. Reward audio and immediate mute.

Reward animations/audio, Dish Detail hero/chips/See all, nearby results/location/quota behavior, Collection detail/Coming Soon treatment, Search focus and sticky navigation were preserved. The accidental enlarged-zoom screenshot did not drive any layout change.
