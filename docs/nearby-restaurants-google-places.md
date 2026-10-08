# Nom Nearby Restaurants — UX correction and dish-availability trust

This focused correction keeps the Phase 2 server boundary and shared state. An opened Dish Details page reuses its cache immediately or searches automatically after location permission is granted. Preview, List/Map, local controls, and restaurant details reuse that search. Search suggestions are explicitly unconfirmed; selected venues have friendly call-ahead advice. Photos remain lazy, and one explicitly selected place supplies detail facts and up to three reviews. Dish images, catalog, recommendation scoring, and image-audit work are preserved.

## Architecture and deployment

```text
React/Vite shared search store
  → POST /api/nearby-restaurants → native Vercel Node → Places Text Search (New)
  → POST /api/place-photo       → native Vercel Node → Place Photos (New)
  → POST /api/place-details     → native Vercel Node → Place Details (New)
Map tab / visible selected-place map → separate public browser key → Google Maps JavaScript API
```

All three handlers also run through Vite's same-origin development middleware. Filesystem-first Vercel routing is retained; unknown API paths return 404 before SPA fallback. Search keeps its 25-second function maximum; photo/details functions have 12 seconds and cancellation support. Each upstream Google call times out at 8 seconds. Photo/details client requests time out at 10 seconds. Static `npm run preview` does not supply API functions: use Vite development or a deployment with the same-origin Node endpoints. No framework or package dependency was added.

The API requires POST JSON, the same-origin/custom-header checks, validated input, bounded bodies, and no-store responses. Search accepts only canonical dish ID plus coordinates; photo accepts only a qualified photo resource name; details accepts only a validated Place ID. None accepts an arbitrary URL or user-supplied search query. Concurrent requests share in-flight work; last-consumer cancellation is preserved. No automatic retries, pagination, or polling were introduced. Same-origin guards are not authentication against non-browser callers; Cloud quotas remain the project-wide limit.

## Discovery contract

Central constants in `shared/nearbyRestaurants.js`:

| Setting | Current behavior |
| --- | --- |
| Text Search pageSize | 10 |
| Useful unique primary target | At least 8 |
| Cuisine fallback | One sequential call when distance-filtered primary has fewer than 8 |
| Merged result maximum | 10, deduplicated by Place ID, sorted closest first |
| Location bias | 50,000 metre circle around rounded browser location |
| Maximum Text Search calls per action | 2; cached reuse uses 0 |
| Text Search Cloud quota | Existing 30/day and 6/minute, unchanged |

Primary records retain exact-search provenance on duplicate Place IDs. Both searches are distance-filtered, then the merged set sorts closest first before limiting to ten. Results beyond 250 miles are excluded; allowed farther results remain reachable on the map while initial bounds favor nearby context. No city or restaurant is hard-coded. A primary failure does not start a fallback; a fallback failure retains useful primary results with a partial notice.

The initial location grant remains deliberate. Once granted, only the currently opened Dish Details page may auto-search. Coordinates are rounded to two decimal places before transmission; the browser recalculates displayed distances and the hard cap from the original location. Denied/unavailable/timed-out states remain usable. Ratings, count, hours, address, and Maps URI come from Search. Unknown hours do not mean Closed; Open Now includes explicitly known, recently observed open venues only. Opening-state observations older than five minutes are labeled as hours at last search. No guessed timezone or closing time is presented.

Final Text Search `X-Goog-FieldMask`:

```text
places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount,places.currentOpeningHours,places.attributions,places.photos
```

Requests retain restaurant type filtering, English response language, and exclusion of pure service-area businesses. No wildcard or review field is requested. Current hours/rating fields already select Text Search Enterprise; adding photo metadata does not add a Photo Media retrieval to the search itself. [Text Search contract](https://developers.google.com/maps/documentation/places/web-service/text-search).

## Product distance rules

`MAX_NEARBY_DISTANCE_MILES = 250` is centralized in `shared/nearbyRestaurants.js`. The 50 km Google location bias remains unchanged and is not treated as a boundary. Server normalization excludes invalid coordinates and results beyond the cap before counting unique primary results; below eight useful results, one sequential cuisine fallback is allowed. Fallback is filtered before merging, exact provenance wins duplicate IDs, and the merge sorts closest first before its ten-result limit. No replacement request or retry follows filtering. Browser presentation recalculates distance from the original device location, enforces the cap again, and sorts memory and saved-ID results. Server screening uses the existing rounded location, so near-boundary candidates may be conservatively omitted.

Bands: 0–50 miles Nearby; >50–150 Extended area; >150–250 Farther away. More distant/global candidates are excluded. Rating and Open Now remain local controls. No restaurant, city, or region is hard-coded.

## Shared state and navigation fix

The old Find handler navigated immediately, removing the preview before results could be observed there. See all also acted as a search trigger. Phase 2 separates these actions: Find runs the search while staying on the dish; See all only navigates. The existing `restaurantSearchState` publishes the completed result once and `useRestaurants` subscribes to it. The shared store applies the default Closest order, so the preview's first three records correspond to the full list's first three records, with the same IDs, facts, photo references, and match provenance. Sorting/filtering only derives a local view of these records.

Dish → Find → preview → See all → List → Map → restaurant → back → Map/List → Dish consumes no additional Text Searches after Find. Restaurant selection requests reviews independently. Saved favorites and the existing visit flow continue to use Place IDs. Reloaded ID-only favorites do not silently fetch business details.

Primary matches read “Matched for Lort Cha”; fallback matches read “Cambodian restaurant nearby.” Search appearance does not confirm menu availability. The disclaimer reads “Dish availability isn't confirmed.” Detail adds “Looking for [dish]?” with call-ahead guidance and a direct Call restaurant action for valid phone numbers. Beyond 50 miles it gives approximate travel distance and recommends confirming the selected dish before traveling; absent phone numbers offer menu/Maps guidance without a broken action.

The shared future evidence vocabulary is `exact-search-match`, `cuisine-fallback`, and `confirmed-menu-item`. Current transport `matchType` remains `exact-dish-search` / `cuisine-fallback` for compatibility. Server and browser derive `matchEvidence` from those types, ignoring claimed confirmation fields. Text Search cannot produce `confirmed-menu-item`; a future confirmation pipeline must require trustworthy menu-level or restaurant-specific evidence. “Dishes to look for” reuses the selected dish and related canonical cuisine images as ideas, explicitly asking users to check the menu.

## Nom restaurant detail and progress

The live detail layout reuses Nom’s original restaurant screen components, tokens, circular action assets, eating character, and aqua background. It includes a rounded hero, name/metadata, gold rating and green known Open status, relevant factual chips, five circular actions, helpful dish-availability advice, the animated swipe, compact map, About/hours, canonical dish ideas, and review cards. No Authentic/Casual claim is invented. Reviews use four-line clipping plus Read more while preserving the full original text.

Directions prefers Google’s returned `googleMapsLinks.directionsUri`, falling back to a key-free Place ID directions URL. Call uses validated `tel:`; Website uses a validated HTTP(S) URI. Missing phone/site actions are disabled. Send to a friend and Share use native Web Share, clipboard, then a selectable manual link, with cancellation handled quietly and no Places calls.

The eating character must travel at least 85% before release. Early release/cancellation returns it to the start; keyboard activation requires Enter/Space twice, Escape cancels, and repeated keys do not confirm. Reduced motion removes animation. Confirmation calls the existing `startVisit` and opens verification; feedback, history, collectibles, duplicate-visit prevention, and rewards remain in the existing flow. Swiping alone does not log a meal or award progress.

## List and interactive Google map

List supports up to ten venues, real venue photo/fallback, rating/count, approximate distance, known opening state, address, match type, favorite, and Google Maps action. Closest, Rating, and Open Now operate entirely locally. Compact preview cards omit the full address.

Map uses Google Maps JavaScript directly, with the marker library and modern `AdvancedMarkerElement`. Its script and first map are created after explicit Map selection or when the selected restaurant’s compact location preview approaches the viewport. Without IntersectionObserver, the preview uses an explicit Show location map action. Markers use the Search coordinates and Place IDs. Marker selection displays a compact Nom summary and detail/Maps actions, with no marker photos or review request. The map uses keyboard-capable Google marker behavior with venue titles. Its native branding and controls remain uncovered.

A map session retains its DOM/map instance across List/Map toggles and restaurant/back navigation. Selected-place previews use the same manager with a restaurant-specific key and a single marker, without another Places search. At most three search sessions are retained in memory; a new search, eviction, or full page reload may create another billable map load. Filtering updates markers and bounds without another search. Initial framing includes places within 50 miles of the closest anchor, while leaving all other markers on the map. Loading/error/missing-key states leave List usable. Authentication/API restriction failures are handled through Google's map-auth failure callback.

Browser variables:

```dotenv
VITE_GOOGLE_MAPS_BROWSER_KEY=your_browser_maps_key
# Optional custom JavaScript map ID; recommended for production advanced markers.
VITE_GOOGLE_MAPS_MAP_ID=your_google_map_id
```

The key is intentionally browser-visible and must be separate from the secret Places server key. No Places browser library is loaded. A configured JavaScript map ID is used when supplied; otherwise `DEMO_MAP_ID` enables development testing. Create a production map ID before release. [SDK loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [advanced-marker setup and map ID](https://developers.google.com/maps/documentation/javascript/advanced-markers/start).

## One venue photo, retrieved safely and lazily

Only the first returned photo is considered. The resource must belong to the same Place ID, have valid required credits, and have its individual Google Maps source URI. Invalid metadata uses the neutral storefront fallback; no dish photograph is presented as a venue photograph.

When the photo holder approaches the viewport, IntersectionObserver requests `POST /api/place-photo` with only `{ name }`. The server calls the fixed Google Photo Media endpoint with `maxWidthPx=800`, `skipHttpRedirect=true`, and the secret API key in a header. It returns a validated HTTPS Google image CDN URL, never a credential-bearing Google Web Service URL. Redirect forwarding is disabled, arbitrary resources/URLs are rejected, and error bodies are not echoed. Preview has at most three holders; full List loads only approaching cards. A browser without IntersectionObserver gets an explicit Load photo action. Selected details may load that venue's photo immediately. Map summaries load none.

Successful Photo Media lookup is reused by preview, list, and details in short-lived memory; image downloads are separate from the Media lookup. Image/network/quota/resource/credit failures retain all restaurant facts and show the neutral fallback, without automatic retry. A failed image element is also replaced cleanly. The subtle “Photo: [author]” caption links to author profiles. An accessible source icon links to the individual photo on Google Maps; large source-link text is omitted. Hero captions wrap to show all authors and include returned safe profile thumbnails when available. Google photo priority is used without claiming that metadata identifies an exterior/storefront image. [Place Photos request, expiry, and attribution](https://developers.google.com/maps/documentation/places/web-service/place-photos).

## Selected-restaurant details and reviews

Selecting a full live restaurant from preview, List, Map's View restaurant action, or a current live favorite triggers one same-origin `POST /api/place-details` with only `{ placeId }`. Existing business facts appear immediately. Direct route rendering does not fetch reviews: it offers Load Google reviews. Reopening the same restaurant reuses a recent memory result or failure and does not repeat the request.

Exact on-demand Details mask:

```text
id,displayName,formattedAddress,rating,userRatingCount,currentOpeningHours,nationalPhoneNumber,websiteUri,googleMapsLinks,priceLevel,primaryTypeDisplayName,editorialSummary,reviews,attributions
```

The same selected-place request refreshes supported business facts and adds phone, website, directions link, real price/type, and editorial summary. Reviews and editorialSummary select the **Place Details Enterprise + Atmosphere** SKU, the same highest tier already used for reviews. No wildcard, routing computation, photo, review summary, or menu field is requested. editorialSummary is displayed verbatim; otherwise About uses structured facts. Contact/website/directions URLs are validated before rendering. [Place Details fields and billing tiers](https://developers.google.com/maps/documentation/places/web-service/place-details).

Display at most three usable reviews in returned relevance order. Preserve original text exactly, including whitespace, escaped as React text; use original language when supplied. Show available rating, author/profile, relative time, source review link, and returned visit month/year. Unattributable reviews are omitted. Missing reviews show an honest empty state; errors show “Reviews unavailable right now” while the venue remains usable. There are no generated summaries or review pagination. Original text is preferred; translated fallback is marked when identifiable.

## Ephemeral data, storage, and attribution

Search version is now `places-text-v3`; v2 search buckets are invalidated so old global results cannot reappear. The 24-hour area/dish metadata cache and maximum twenty saved buckets remain. Older-version buckets are discarded without a Google call. Durable storage contains only Place IDs, temporarily cached venue coordinates, and Nom search metadata; favorites retain IDs. Names, addresses, ratings, hours, photo names, URLs, attribution payloads, and reviews are never placed in localStorage. Full results survive ordinary navigation in active app memory. After reload, saved IDs use generic names and Maps links until an explicit refresh obtains current facts.

Photo lookup URLs and review results/failures use a ten-minute memory reuse window. New media requests refuse references observed more than ten minutes ago; this is a conservative application cutoff, **not a guaranteed Google resource lifetime**. Photo names can expire earlier. The user can explicitly refresh Search for fresh references; no automatic Search/Details recovery is performed. No review/photo data is written into validation reports or durable server/CDN caches.

Places views show Google Maps attribution and returned third-party credits. Photos/reviews also link to their individual Google Maps sources and display author attribution. Returned review visit month/year is displayed, including the France-specific policy case. SDK branding is left intact. Public Terms/Privacy explain location, ephemeral photos/reviews, map activation, and Google policies. Owner review of operator-specific published policy copy remains a release check. [Current Places policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Maps service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms).

## API call model and diagnostics

| User action | Text Search | Photo Media | Details/reviews | Map loads |
| --- | --- | --- | --- | --- |
| Recommendation rendering / ungranted dish | 0 | 0 before search | 0 | 0 |
| Open granted dish / Find / intentional Refresh | 1–2, or 0 on valid reuse | Up to 3 approaching preview photos | 0 | 0 |
| See all / local sort/filter | 0 | Only newly approaching uncached venue photos | 0 | 0 |
| Explicit Map tab | 0 | 0 for markers/summary | 0 | 1 on first construction; 0 on reuse |
| Choose restaurant / Load reviews | 0 | Selected photo if needed and reference fresh | At most 1 selected place | 1 when its preview first becomes visible; 0 on reuse |
| Details/back, favorite, Maps link | 0 | Reuse when recent | 0 on recent reuse | 0 on retained map reuse |
| ID-only reload/render | 0 on valid cache | 0 | 0 | 0 before visible preview / explicit Map |

The total potential Photo Media calls for ten results can reach ten if the user scrolls through every photo; opening See all does not eagerly make ten calls. Cache reuse and in-flight deduplication reduce repeats. An expired review result can be requested again on a later explicit selection.

Development diagnostics track Text Search, Photo Media, Place Details, and map constructors separately, with no normal production counter UI. Successful Search receipts report calls; photo/details receipts also report known failed upstream attempts. Transport failures/cancellations and other clients are not fully observable locally. Google usage/billing metrics are authoritative. Cancellation cannot undo an already sent billable request. Keys, coordinates, raw Google error bodies, and raw exceptions are not logged by application diagnostics.

## Manual Google Cloud setup before heavier live testing

No Cloud API, key, quota, paid Vercel feature, or deployment was changed by this task.

1. Select the existing Google Cloud project and billing account. Leave **Places API (New)** and its existing server-key restrictions intact. Photos/Details are methods of this API; do not enable legacy Places or unrelated APIs. Keep **SearchTextRequest per day = 30** and **per minute = 6**.
2. Open **APIs & Services → Library → Maps JavaScript API → Enable**. Only this additional API is required for the interactive map.
3. Open **APIs & Services → Credentials → Create credentials → API key**. Edit the new key: **Application restrictions → Websites / HTTP referrers**; add only the actual Nom production origin pattern, e.g. `https://<your-nom-domain>/*`, and specific intended preview domains. If local development is needed, add `http://localhost:5173/*` and `http://127.0.0.1:5173/*` only as used. Avoid broad `*.vercel.app` or unrestricted referrers. Set **API restrictions → Restrict key → Maps JavaScript API only**. Save. Do not reuse the server key or loosen its restrictions.
4. Put the browser key in ignored `.env.local` as `VITE_GOOGLE_MAPS_BROWSER_KEY`. Existing `GOOGLE_PLACES_API_KEY` stays server-only. Optionally create **Google Maps Platform → Map Management → Create map ID → JavaScript**, then set `VITE_GOOGLE_MAPS_MAP_ID`. Restart Vite. For production, add the separate VITE variables to the intended Vercel environments and rebuild/redeploy when authorized; these values are compiled into browser assets. Never name the server secret with a `VITE_` prefix.
5. Open **APIs & Services → Places API (New) → Quotas & System Limits**. Filter for the Photo Media method **GetPhotoMediaRequest**. Lower **GetPhotoMediaRequest per day to 30** and **per minute to 10**, where the project offers those rows. This is independent of SearchTextRequest.
6. On the same Places API (New) quota page, filter for **GetPlaceRequest**. Lower **GetPlaceRequest per day to 20** and **per minute to 6**. Reviews use this Details method; there is no separate “review request” quota to lower. Leave all SearchTextRequest limits unchanged.
7. Open **Maps JavaScript API → Quotas & System Limits**. Find the **Map loads** quota surface. Target **Map loads per day = 100**, **per minute = 10**, where offered. Apply any per-user/IP row conservatively as well; it does not replace a project daily ceiling. Do not apply a Maps Embed, Static Maps, or Places quota as a substitute.
8. Verify saved effective limits and remaining billing-account free SKU allowances, then run the single-flow smoke below. Set billing alerts if useful, but alerts are not a hard spending cap.

**Quota-console limitation:** This environment cannot inspect your authenticated Cloud quota table. Method identities above are established by Google's current API, but exact display labels and availability of editable daily limits vary by project/product. If a daily row is absent or not reducible, a minute limit alone cannot enforce the daily/monthly ceiling. Resolve the account-wide limit with Google or keep the new live feature/API/key disabled before broader use. Warm-instance photo guards (30/day, 10/minute) and Details guards (20/day, 6/minute) are defense in depth and reset across cold starts; they are not a global quota. Map loads have no server-owned global guard. [Places quotas](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [Maps JavaScript quotas](https://developers.google.com/maps/documentation/javascript/usage-and-billing), [quota monitoring](https://developers.google.com/maps/documentation/javascript/report-monitor), [Places method definitions](https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/maps/latest/places/apiv1/placespb).

Current standard global pricing, checked 2026-10-04:

| Surface / billing SKU | Free events/month | First paid tier per 1,000 | Proposed maximum in 31 days |
| --- | ---: | ---: | ---: |
| Text Search Enterprise | 1,000 | $35 | 930 at existing 30/day |
| Place Details Photos | 1,000 | $7 | 930 at 30/day |
| Place Details Enterprise + Atmosphere (reviews) | 1,000 | $25 | 620 at 20/day |
| Dynamic Maps | 10,000 | $7 | 3,100 at 100/day |

These targets fit standard allowances if other billing-account usage does not consume them. They are a **$0 target**, not an unconditional guarantee. Confirm applicable pricing and billing-account usage; services have separate allowances/quotas. [Google's current pricing table](https://developers.google.com/maps/billing-and-pricing/pricing).

The server key remains API-restricted to Places (New). Appropriate server application restrictions use actual server outbound IPs, not website referrers or domain DNS addresses. Ordinary Vercel egress is dynamic, so an IP allowlist requires existing stable egress or another suitable host. Vercel Static IPs are a paid option and were not enabled; no hosting-plan change is needed for this repository work. [Google API security guidance](https://developers.google.com/maps/api-security-best-practices), [Vercel Static IPs](https://vercel.com/docs/networking/static-ips).

## Validation and remaining live checks

Current correction validation: **640 tests passed in 37 files**, 47 more than the Phase 2 baseline of 593. Existing image-workflow Python checks also run through the application suite (40 + 16 passing); no global image audit or production import is rerun. No lint/typecheck script is configured. The production build and canonical validation pass. A sentinel server credential build and actual-key scan confirm the secret, server-key variable/header, and Google Web Service endpoint are absent from browser assets. Existing dish-image, canonical/recommendation, dependency, and prior report files were checked against the task-start snapshot.

Current artifacts: `docs/nearby-restaurants-ux-correction-validation.json` and `docs/nearby-restaurants-ux-correction-validation/`. Historical Phase 2 artifacts remain in `docs/nearby-restaurants-phase2-validation.json` and `docs/nearby-restaurants-phase2-validation/`. Phase 1 validation evidence is retained separately and describes its historical implementation. Automated Google/Maps/geolocation/image-intersection checks use mocks, including the exact Find → preview → See all → Map → restaurant → back sequence, no-extra-search assertions, ten-result/threshold/dedupe behavior, guarded endpoints, secret-safe request shapes, viewport photo loading and broken-image fallback, original reviews/source credits, cached reopen, missing keys, marker IDs/coordinates, outliers, and map reuse. In-process Vite middleware checks verify 405/400/503 JSON responses for all three APIs with no external calls.

The local server key exists. During historical Phase 2 validation, one bounded live Search smoke was attempted with explicit San Francisco fixture coordinates (not inferred user location); it failed with sanitized `NETWORK_ERROR` in the restricted execution environment. No fallback/photo/Details/Map call followed. The browser connector has no connected browser and local socket binding reports EPERM. The separate browser Maps key is absent. No live Google calls were made during this correction pass. Real photo/review responses, map rendering, deployed routing, and screenshots remain manual checks; mocked tests do not establish those live facts. Figma metadata exposed the Product overview page but not the requested 03.03 detail frame. The user-authorized fallback uses existing Nom detail assets/components and the supplied hierarchy; rendered fidelity still needs browser comparison.

After configuring/rechecking the quotas and browser key:

1. Open one plausible dish with location permission ungranted; verify the deliberate Find permission flow. After granting, opening another dish should reuse its cache or auto-search only that dish. Check that recommendation rendering, rerender, and back navigation do not start searches. Preview has at most three visible photo lookups; Search makes one primary plus at most one fallback.
2. Open See all. Compare the first three IDs/facts/photos with the preview. Scroll only enough to verify one additional lazy photo; sorting and Open Now must issue no Text Search. Confirm fallback wording, unknown hours, author/source credits, and neutral error images.
3. Select Map once. Verify one Maps script/constructor, exact marker coordinates, Google branding, local filter updates, and photo-free marker summaries. Switch List/Map and retain the map.
4. Open one restaurant. Existing facts render immediately; at most one Details request loads phone/site/directions/price/type/editorial text and up to three original reviews. Check the five actions, unconfirmed-dish notice, direct call action, farther-distance travel advice, author/source links, visit month/year, and Read more. The compact map loads lazily with a separate Dynamic Maps event, then reuses its retained instance on reopen. Back/reopen must not search again. Test the swipe threshold, cancellation, keyboard confirmation, reduced motion, and normal verification/feedback flow using mocked location for repeat checks.
5. Return to Dish and verify the populated preview. Check 360px/390px, tablet, and desktop layouts; long names/credits/reviews, photo crops, keyboard controls, statuses, and map height. Reload once to check ID-only storage and explicit refresh behavior; avoid another live Search unless needed.
6. Verify deployed APIs return JSON (GET gives 405), not SPA HTML. Use mocks/blocked network for repeated error, denial, quota, and expiry checks. Stop after this single flow; never run 201 live searches or repeatedly load every photo/review/map for fixtures.
