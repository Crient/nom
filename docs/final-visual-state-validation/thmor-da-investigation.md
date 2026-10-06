# Lort Cha / THMOR DA investigation

## Confirmed from the running code and contract tests

- Primary query: **`Lort Cha Cambodian restaurant`**.
- Conditional fallback: **`Cambodian restaurant`**, only when the primary yields fewer than eight valid, deduplicated venues.
- There is **no third nearby fallback** in this implementation. No extra query was added for this investigation.
- Requests use restaurant type filtering, ten results per request, and a 50,000m location bias. The server rounds the search coordinates to two decimal places. Location bias is not the distance cutoff: Nom rejects results beyond 250 straight-line miles.
- Normalization also rejects invalid Place IDs, missing names, invalid coordinates, or unsafe/missing Maps URLs. Missing photos, rating, hours, reviews or details do not exclude a valid venue.
- Deduplication collapses Place IDs and complete normalized name/address identities; aliases remain attached to the surviving venue. Results are sorted by distance and capped at ten.
- The client recalculates distance from the current position and applies the same cap. Moving after a cached search can remove results locally without issuing another Google request.
- The dish screen shows only the first three non-metadata-only venues. “See all” shows the list. Optional list rating/open filters can hide venues; sorting alone does not remove them. There is no dish/menu matching threshold after Text Search.
- Historical `preview-thmor-da` data is a development example / saved legacy venue, not proof of a live Google result. It is not inserted into live searches.

## Raw response evidence status

**No live Google response was captured in this pass.** The user's search area was requested but has not been supplied. The in-app browser reports no connected browsers. Therefore it is unconfirmed whether Google omitted THMOR DA or Nom later excluded it. No upstream/ranking conclusion is asserted, and no billable search was made.

The diagnostic tests use clearly labeled synthetic fixtures. They prove that a venue present only in fallback survives without a photo, that a far-away venue is excluded with `distance-cap`, that dedupe aliases remain traceable, and that distance rank/result-limit decisions are reported. Those fixtures are not evidence about the real restaurant.

## Capture the actual search

1. Start local development with `NOM_NEARBY_DEBUG=1 npm run dev` (or set `NOM_NEARBY_DEBUG=1` in local server configuration and restart). The production API does not enable this option. The flag is server-only; no key is exposed.
2. Open Lort Cha in the same search area as the reported issue and deliberately choose **Find nearby restaurants** / **Refresh nearby restaurants** once. Cached results from before debugging do not contain a trace. The existing request limits and fallback threshold remain in force.
3. Inspect the `/api/nearby-restaurants` JSON response. `searchDebug.events` contains:
   - `plan`: exact planned queries and filtering rules;
   - `query-sent`: each query actually issued;
   - `query-response`: untouched successful `rawPlaces`, per-place normalization decisions/distance, and deduped IDs/aliases;
   - `fallback-decision`: whether fallback ran and the accepted primary count;
   - `ranked-results`: all combined candidates, rank, aliases and `returned` / `result-limit` disposition.
4. Compare browser console `[Nom nearby]` server IDs / client-presented IDs with `[Nom nearby preview]` and `[Nom nearby rendered]` visible IDs. Preview exclusions explicitly distinguish `metadata-only` / `preview-limit-3`; list logs include active filters and exclusion reasons. The Network response contains raw venue names, so a case-insensitive THMOR DA search can be followed by its Place ID and alias IDs.
5. If THMOR DA appears in a raw response, follow that ID through normalization → dedupe aliases → ranked results → client distance presentation → actual preview/list IDs. A failed photo or detail request cannot independently remove the search card.
6. If it is absent from every **actually issued** raw response, the omission occurs upstream of Nom's result normalization. If fallback was skipped, that says nothing about whether a separately executed broader search would return it. Do not run an additional fallback merely to manufacture evidence without considering the existing quota.

Raw traces stay in the local response, browser session and opt-in development console. They are not written into localStorage, production logs or durable Google response caches. Disable the debug flag after capture.
