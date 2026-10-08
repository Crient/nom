# Final surgical visual / diagnostic pass

Date: 2026-10-07. Scope: the current restored working tree, compared with a private snapshot taken immediately before this pass. No Git staging, commit, push, deployment, migration, environment edit, or remote configuration change.

## Exact files changed in this pass

Existing working-tree files modified (some were already untracked before this pass):

1. `src/styles/hubs.css` — natural-height clamped Recently Explored titles.
2. `src/styles/experience.css` — Verify Visit spacing, map caption/failure layout, failed verification modal proportions.
3. `src/pages/VerifyVisit.jsx` — unavailable-service copy and compact map attribution placement; verification control flow unchanged.
4. `src/components/experience/VisitVerificationMap.jsx` — compact failure copy/retry, map-state layout hook, attribution caption slot.
5. `src/components/experience/EdgeStateModal.jsx` — requested unverified option subtitle.
6. `src/components/experience/ActivityCard.test.jsx` — natural title height and two-line clamp contract, consistent cards/images.
7. `src/components/experience/VisitVerificationMap.test.jsx` — failure circle, attribution, retry/recovery and no fake artwork.
8. `src/pages/VisitVerification.test.jsx` — unavailable service never claims a GPS attempt; exact three fallback options/subtitles.
9. `src/pages/ExperienceFlow.test.jsx` — updated manual option selector only.
10. `src/pages/LiveNearbyRestaurants.test.jsx` — updated manual option selectors only.
11. `src/pages/OvernightNavigation.test.jsx` — updated manual option selector only.
12. `src/pages/ProductionAudit.test.jsx` — updated manual option selector only.

New file: `docs/final-visual-diagnostic-validation/report.md` (this report).

## Spacing changes

These are CSS specifications, not measurements from a rendered browser.

| Area | Before | After |
| --- | --- | --- |
| Recently Explored title | Fixed 36px height, including blank second line for short titles | Natural one/two-line height; 18px line-height, two-line WebKit clamp with overflow hidden |
| Title → metadata | 4px after reserved title block | 4px after actual title; no bottom distribution |
| Recently Explored geometry | 112px cards, 64px images, width/flex-basis `min(78cqw,290px)` | Same dimensions and horizontal rail |
| Map outer margins | 11px top / 12px bottom | 8px top / 4px bottom |
| Failed/loading map | Circle plus unused 48px native footer reservation | Same 251px circular area, without an unused footer; compact failure and 44px retry target |
| Loaded map | 251px circle + native 48px attribution strip | Preserved; native branding/copyright mask unchanged |
| External map link / Places attribution | Separate vertical blocks; attribution adds 10px/5px padding | Shared wrapping caption, no attribution padding; external link remains 44px target |
| Status stack margins | 24px top / 16px bottom | 4px top / 4px bottom |
| Status cards | 80px minimum, 12px gaps, 58px icon circles | 72px minimum, 6px gaps, 48px icon circles; 17px headings and 15px body retained |
| Privacy helper | 62px minimum, 12px top margin | 54px minimum, 4px top margin |
| Verify page / Continue | Fixed 961px minimum page; 80px button; 39px bottom margin | Viewport minimum; 60px button; bottom margin at least 16px with safe-area allowance |
| Failed modal padding | 44px top / 20px sides / 18px bottom | 24px top / 16px sides / at least 14px safe bottom |
| Failed modal warning / headline | 48px warning, 10px title gap, 20px/25px headline | 32px warning, 6px gap, 18px/23px headline |
| Failed modal subtitle / options | 12px subtitle gap, 15px options gap | 6px subtitle gap, 12px options gap |
| Failed modal cards | 62px minimum + content wrap; 10px gaps; extra 10px before manual card; 44px icons | Equal grid rows with 60px minimum and content-safe growth; 6px gaps; no extra manual gap; 32px icons |
| Failed modal maximum | `min(85dvh,720px)` | `min(80dvh,560px)`; independently scrollable content/options retained |

The close button remains 44×44px. Other modal kinds retain their existing styling. Text wrapping/large font settings may increase content heights; content is not clipped merely to force a viewport fit.

## State messaging and behavior

PASS — unavailable-service status now progresses through “Location was not checked.” → “Location verification is currently unavailable.” → “Use another option to log your visit.” This case does not ask for GPS. Actual too-far, low-accuracy, denied-permission and timeout outcomes keep their distinct messages.

PASS — fallback contains exactly QR, receipt and unverified logging. Subtitles are respectively “For partnered restaurants”, “Take or import a photo of your receipt”, and “Save to history without adding progress”. Location retry stays outside the sheet. Explicit manual confirmation, signed proof acceptance, cancellation, reward guards and automatic entry verification are preserved.

PASS — map failure says “Map unavailable” / “Try again”. The failed canvas is hidden as a whole; no native branding element is selectively hidden. Loaded maps retain the native attribution strip. Google Places attribution and any returned provider links remain visible in the compact caption. The standalone Google Maps label came from `GooglePlacesAttribution`, not decorative marketing copy. It remains useful when the embedded map fails and Places-derived restaurant information is still displayed. [Google attribution guidance](https://developers.google.com/maps/documentation/places/web-service/policies).

## Local map diagnosis

Verified read-only, without printing or storing environment values:

- Expected browser variable: `VITE_GOOGLE_MAPS_BROWSER_KEY`.
- Vite development environment: browser key and `VITE_GOOGLE_MAPS_MAP_ID` present and non-placeholder.
- Actual served `http://localhost:5173/src/data/googleMapsLoader.js`: environment injection contains a non-placeholder browser key and map ID. An undefined/missing browser variable is ruled out for this running server.
- Loader requests Maps JavaScript from Google's `maps/api/js` endpoint with the marker library, asynchronous callback and quarterly version. Browser request execution was not directly observable here.
- Verify Visit and Nearby/location previews use the same `loadGoogleMaps` function. There is no separate verification-map browser key. Nearby uses the shared session manager; Verify Visit uses a temporary map instance.
- Server Places requests use `GOOGLE_PLACES_API_KEY`, which is also present locally. Its presence/success does not establish that Maps JavaScript is enabled or that the browser key's restrictions are correct.
- The loader's script error, 12-second timeout and `gm_authFailure` paths collapse into `MAP_UNAVAILABLE`. Missing configuration separately produces `MAP_NOT_CONFIGURED`. `gm_authFailure` has no captured Google error-code detail; the existing loader was not changed.

BLOCKED — exact Google Maps error code and underlying Google configuration cause. Browser discovery returned no available browser. A nonempty key is not evidence that the key is valid or that referrers, API activation, billing or quota are correct. No claim is made that unpushed code caused this error. No remote Google change is justified until the actual console code is known.

### Exact manual DevTools check

1. Open the failing localhost page. Open Chrome DevTools → Console, enable Preserve log, clear old logs, then reload and enter a real restaurant's Verify Visit page.
2. Filter for `Google Maps JavaScript API` and copy only the exact error code. Do not paste a script URL, API key, environment object, or credentials.
3. In Network, filter `maps/api/js`. Check whether loading was attempted, its status, and the request's Referer. A script HTTP 200 alone does not prove successful API authentication. Check blocked requests/CSP/content blockers if there is no Google error code.
4. This optional Console snippet returns only safe flags, never the key or request URL:

```js
(() => {
  const script = document.querySelector('script[data-nom-google-maps]');
  return {
    origin: location.origin,
    scriptPresent: Boolean(script),
    keyParameterPresent: Boolean(script && new URL(script.src).searchParams.get('key')),
    sdkReady: Boolean(window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement),
  };
})()
```

5. Interpret the observed code using [Google's error reference](https://developers.google.com/maps/documentation/javascript/error-messages):

| Observed code | Check read-only first |
| --- | --- |
| `RefererNotAllowedMapError` | Actual localhost host/port versus permitted browser-key website referrers; localhost and 127.0.0.1 differ |
| `ApiNotActivatedMapError` | Maps JavaScript API activation in the browser key's Google project; Places activation alone is insufficient |
| `ApiTargetBlockedMapError` | Browser key API restrictions permit Maps JavaScript API |
| `BillingNotEnabledMapError` | Billing attachment/status for that Google project |
| `InvalidKeyMapError` | Key validity and the correct project/key being used locally |
| `OverQuotaMapError` | Relevant Maps usage/quota limits |
| `MissingKeyMapError` | The actual request has a key parameter; compare against the served-module presence evidence |

Remote Google configuration may need attention if one of those codes confirms it. None of these causes was observed by tooling, so none is presented as the likely diagnosis. Keep restrictions intact and do not change remote settings during this review.

## Separate local verification/account configuration

PASS — read-only localhost capability GET returned HTTP 200 with `location:false`, `qr:false`, `receipt:false`. This explains why automatic verification cannot execute locally; it does not explain Google's map error.

Local configuration lacks `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. The derived browser verification public key is consequently unavailable; setting a standalone public variable would not provision the server. Receipt OCR configuration and participating QR restaurant configuration are absent too. No environment file was changed. Production configuration is not inferred from local absence. Verification also requires the separately reviewed database rollout; it was not applied or tested remotely in this pass.

## Validation

| Check | Result |
| --- | --- |
| Focused touched-component/journey tests | PASS — 189 tests, 7 files |
| Full Vitest suite | PASS — 1,247 tests, 74 files |
| Python script suite | PASS — 74 tests |
| Catalog/workbook check | PASS — 201 unique dishes, spreadsheet order validated |
| Production build with QA/design flags deliberately set | PASS — privileged client boundary check also passed |
| Account/source credential boundary | PASS |
| Package dependency tree (`npm ls --all`) | PASS |
| npm security audit | PASS — zero vulnerabilities |
| Whitespace/diff check | PASS |
| React review | PASS — no new effects/listeners, conditional hooks, state lifecycle changes or data-fetching paths; touch targets and wrapping preserved |
| Rendered 360/375/390/430/440px visual checks | BLOCKED — no browser available; not claimed as rendered PASS |
| Exact live Google Maps error | BLOCKED — manual Console check above |

Manual visual inspection remains: short and long Recently Explored titles, ellipsis, metadata gap, map-to-status spacing, Google attribution visibility, three compact fallback cards, close/tap targets, Continue visibility, and absence of horizontal overflow at all five widths. Also check receipt/QR/manual selection and text enlargement in the sheet.

## Preservation

The private baseline contains 831 nonignored files. Exactly the 12 files listed above changed; 819 baseline files remained byte-identical and no baseline files were removed. This report is the only added file in this pass. HEAD remains `c13329e86e89b17dfcf78b2815557b37ce04703c`; the Git index checksum is unchanged. Home JSX, Restaurant Details, Welcome, server code, migrations, catalog, recommendation logic, Guest/account/sync architecture and existing reports are unchanged from this pass's starting state. Temporary snapshots/logs are outside the repository under `/private/tmp/nom-final-visual-diagnostic` and are not intended commit artifacts.

Stopped after the requested pass. No further general polish or remote action.
