# Nom Friends and in-app sharing V1 — local review, 2026-10-08

Implemented locally after the separate surgical UI pass. No staging, commit, push, deployment, remote SQL/configuration change or real test-user creation. The current restored Home, discovery engine, 201-dish catalog, verification/rewards and existing account architecture remain intact.

## Product and architecture

- Friends lives at `/friends`, reachable from the existing signed-in Profile. `/friends/inbox` contains Shared with you and an unread count. Profile gained only two account links; existing content/layout is retained.
- Signed-in users explicitly opt in by choosing a public handle and name. Handles are lowercase, 3–24 characters, start with a letter, use letters/numbers/underscores and remain fixed. The public name is editable and separate from the existing private profile name.
- Search matches starting characters of the handle or public name (minimum two, maximum 40); returns up to 20 handle/name pairs. No email, phone, Auth provider, Auth UUID or OAuth avatar URL is returned for other users. Initial avatars use public names. Private profiles are not made public or automatically copied.
- Incoming requests offer Accept/Decline, outgoing requests show Pending/Cancel, accepted friends appear mutually and removal requires a local confirmation. Pending reverse requests must be explicitly accepted rather than implicitly accepted by sending another request.
- Send to a friend opens a compact Nom picker of accepted friends only. One recipient, search, optional 280-character note, explicit Send and “Sent to [name]” success. No navigator.share call or unnecessary success navigation. Retrying an unchanged failed send retains its UUID for idempotency.
- Restaurant Details keeps its five existing actions and layout; Send to a friend is wired to the picker. Dish Details offers small Send dish / Send recommendation actions. The isolated restaurant QA preview cannot send synthetic references.
- **Share is external sharing**, retaining Web Share API, clipboard and manual-link fallback. Guests can still use it. This supersedes the earlier interpretation/tests that incorrectly equated Send to a friend with native Share.
- Guests receive an account-required sheet with Sign in or create account / Cancel. No Guest social state, registration, upload or social outbox. Sign-in returns to the selected screen via the existing safe return mechanism.
- Shared items store a type, stable content ID, restaurant dish context where needed, note and timestamps; no duplicated dish/Places payload, exact user GPS, match scores, preferences, signed proof or credentials.
- Inbox hydrates canonical dish names. Opening dish/recommendation uses existing Dish Details with explicit shared context, independently of the receiver’s questionnaire; it does not fabricate a match percentage or replay sender preferences. Opening restaurants loads current details through the existing Places service, only on open/direct reload. No extra Maps configuration or new API field mask. Fresh nearby coordinates are still required by the established I Ate Here flow. Missing catalog items and unavailable restaurant details have safe restart/unavailable states.
- Inbox pages 50 references at a time using a timestamp/UUID cursor; older items remain accessible. Only the recipient marks opened, idempotently. Notes render as plain text. Sender can read their own sent rows through RLS; a separate Sent UI is outside this V1.
- Social data comes from authenticated RPCs, held in memory under the existing account boundary. Reloads/fresh devices hydrate from the server; account switch/signout discard old data and late responses. Focus and a 60-second refresh update in-app indicators. No push/email/SMS, feed, chat, followers or public profile page.

## Migration for review — NOT applied remotely

`supabase/migrations/20261008051711_nom_friends.sql`, generated with the Supabase CLI and validated by executing the exact SQL in a disposable local PostgreSQL/PGlite database with the two existing migrations.

Four new tables:

| Table | Columns | Integrity |
| --- | --- | --- |
| `nom_social_profiles` | handle (PK), user_id (unique Auth FK), display_name, created_at | Opt-in public identity, format/length checks, Auth deletion cascade; direct reads only of own row |
| `nom_friend_requests` | id (UUID PK), sender_handle, receiver_handle, status, created_at, responded_at | Both handle FKs cascade; no self request; pending iff response timestamp null; pending/accepted/declined/cancelled |
| `nom_friendships` | user_a, user_b, created_at | Sorted distinct handles, composite PK, both profile FKs cascade |
| `nom_shared_items` | id (UUID PK), sender_handle, receiver_handle, content_type, content_id, dish_id, message, created_at, opened_at | Both profile FKs cascade; no self share; only dish/restaurant/recommendation; stable reference formats; restaurant requires dish context; note <=280 codepoints; opened timestamp cannot predate creation |

Nine added indexes (in addition to PK/unique indexes): one unique pending unordered pair; requests by receiver/status/time and sender/time; friendship user_b; shares by receiver/time/ID and sender/time/ID; partial unread; public name and handle prefix indexes. Every FK is covered by a leading index or composite PK.

Twelve functions: ten public RPCs and two private identity helpers. No triggers, existing-column changes, existing-row normalization, existing-policy/grant changes or changes to the verification/private replay schema.

Public RPCs:

- `register_nom_social_profile(text,text)`
- `search_nom_users(text)`
- `get_nom_social()`
- `send_nom_friend_request(text)`
- `respond_nom_friend_request(uuid,boolean)`
- `cancel_nom_friend_request(uuid)`
- `remove_nom_friend(text)`
- `send_nom_shared_item(uuid,text,text,text,text,text)`
- `open_nom_shared_item(uuid)`
- `list_nom_shared_items(timestamptz,uuid)`

Private helpers in new `nom_social_private`: `current_handle()` and `require_handle()`. Only current_handle is executable by authenticated clients, to support RLS; no caller-selected user argument and no exposed private tables.

## Security and state transitions

- RLS on all four tables. Authenticated table privileges are SELECT only: own public-identity mapping, participant requests/friendships/shares. No anonymous SELECT or RPC execution, no direct authenticated INSERT/UPDATE/DELETE. There are four SELECT policies; no permissive write policies.
- RPCs intentionally use SECURITY DEFINER for atomic cross-user transitions and constrained directory search. Every function has an empty fixed search_path; default PUBLIC/anon EXECUTE is explicitly revoked. Only reviewed RPCs and the narrow current-handle helper are granted to authenticated. Private require_handle is not callable by normal clients.
- Caller identity is derived from auth.uid(), joined to a live non-anonymous Auth user and opt-in social profile. Sender UUID/handle is never accepted for authority. Deleting the Auth user makes old-token social operations fail even before token expiry. No user_metadata/JWT editable profile data is used for authorization.
- Receiver alone accepts/declines; sender alone cancels pending requests. Pair advisory locks plus the unique pending pair index serialize reciprocal/duplicate requests. Acceptance and friendship creation are one transaction. Accepted/declined responses retry idempotently; replaying an old accepted request after removal cannot recreate friendship.
- Removing a friend deletes the single mutual relationship. Existing received shares remain readable after removal; new sends require the current accepted relationship. Sending/removal share the same pair lock, and sending locks the relationship row.
- Shares use a client-generated UUID only for idempotency. Retry must match sender, recipient, reference, dish context and note. Changed/reused IDs cannot overwrite items. Server derives sender/timestamps; receiver alone marks opened.
- Fifty new requests and 100 new shares per sender per rolling day; sender lock protects the limits. Declined requests from the same sender to the same recipient have a one-day retry cooldown. Search wildcard characters are escaped. These are small abuse bounds, not a blocking/followers feature.
- Account deletion: Auth -> public social identity -> all incoming/outgoing requests, friendships and sent/received shares cascade. Shares disappear from both participants when either account is deleted; no anonymized ghost sender, orphan FK or identity retention. Existing account deletion endpoint needs no code or credential changes.

Security design reviewed against [Supabase function privileges](https://supabase.com/docs/guides/database/functions) and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). The relevant current Postgres minor-release changelog does not affect this migration’s standard B-tree indexes/functions; no ltree, btree_gist or legacy PGP encryption is added.

## Compatibility and recovery

The migration is additive and transactional. Existing Auth, account tables, RLS, deletion endpoint, verification RPCs, meal/reward accounting and Guest caches are untouched. The UI honestly reports Friends setup unavailable if the migration is absent; no fake success/friends are supplied. Uses existing client publishable config and authenticated sessions; no new credential or environment variable is needed.

Before any later remote application: explicitly approve the migration, reconfirm Nom / iwamwxsosrhxsdcsuoiu, check migration/object drift and take schema/data backups. Do not run a bulk migration push. After approval/apply, run focused two-user live RPC/RLS checks and security/performance advisors before Preview/Production release.

Recovery before use: transaction failure rolls back the new objects. After social data exists: take/export a private backup and roll back frontend access first; preserve the new tables/data. Full schema removal would destroy requests/shares and requires a separately reviewed explicit rollback. No DROP/recovery script has been executed or prepared for automatic use.

## Validation status

- PASS: local SQL execution and actual PostgreSQL RLS/grants/RPC tests. Anonymous/anonymous-Auth denial, private-field exclusion, existing account/meal preservation, friend requests/duplicates/self/reverse handling, acceptance/decline/cancel authority, mutual friendships/third-user denial/forgery/removal, stable dish/restaurant/recommendation sends, recipient/sender/third-user isolation, note limits, idempotent sends/read-state, invalid refs, cursor pagination and deletion cascades.
- PASS: UI/repository/account-scope/route tests. Accepted-only picker, Guest requirement vs external Share, optional note, retry ID, no backend/demo success, safe user search, request controls, opt-in identity, unavailable references, plain-text notes, unread state, reload/server hydration, account-switch/late-response isolation, shared routes without preferences, direct restaurant detail rehydration and graceful Places failure.
- PASS: complete Vitest suite, Python suite, normal production build, catalog validation/import consistency (201 dishes), source/generated-browser credential scans, npm audit and diff whitespace check. Exact counts/fingerprints recorded below.
- BLOCKED by intentional approval boundary: live Nom Friends tests and real two-user/device QA. Migration has not been applied.
- BLOCKED: rendered visual checks at 360/375/390/430/440px — no browser is connected to the automation tooling. DOM/CSS contracts and interactions passed; no rendered screenshot evidence is claimed.

Manual checks after approval and live migration validation: create two disposable authenticated identities/handles; A searches B and sends a request; B accepts/declines; check both friend lists; send each content type with/without note; B refreshes another device, checks unread/Open/current content; unfriend and confirm new sends fail but old inbox survives; signout/signin/switch identities; verify Guest native Share separately; delete only disposable accounts and verify cascades. For UI only, inspect the map’s native attribution, aligned header targets, both drag badges and chip wrapping at each requested width. No remote account/email/GPS test was run in this pass.

## Exact current-turn file inventory

This list is compared to the restored working tree at the start of this turn, rather than to HEAD, which also contains substantial earlier work. No files were deleted.

Modified existing files (23):

- `src/App.jsx`
- `src/components/experience/VisitVerificationMap.jsx`
- `src/components/experience/VisitVerificationMap.test.jsx`
- `src/components/recommendations/DishDetailHero.jsx`
- `src/components/recommendations/SurpriseDishCard.jsx`
- `src/components/restaurants/LiveRestaurantDetails.jsx`
- `src/components/restaurants/RestaurantActions.jsx`
- `src/hooks/useDishRecommendation.js`
- `src/pages/DishDetails.jsx`
- `src/pages/NearbyPhase2.test.jsx`
- `src/pages/NearbyRestaurants.jsx`
- `src/pages/Profile.jsx`
- `src/pages/RestaurantDetails.jsx`
- `src/pages/SurgicalUiReview.test.jsx`
- `src/routes.jsx`
- `src/styles/chrome.css`
- `src/styles/experience.css`
- `src/styles/global.css`
- `src/styles/hubs.css`
- `src/styles/surprise.css`
- `src/test/accountFixtures.js`
- `src/utils/accountNavigation.js`
- `src/utils/navigation.js`

New files (17):

- `docs/friends-sharing-validation/report.md`
- `docs/surgical-ui-spacing-validation/report.md`
- `server/friendsDatabase.test.js`
- `src/components/SurgicalUiGeometry.test.jsx`
- `src/components/social/FriendPicker.jsx`
- `src/components/social/SendToFriend.jsx`
- `src/components/social/social.css`
- `src/context/Friends.jsx`
- `src/context/Friends.test.jsx`
- `src/data/sharedContent.js`
- `src/data/socialRepository.js`
- `src/data/socialRepository.test.js`
- `src/pages/Friends.jsx`
- `src/pages/Friends.test.jsx`
- `src/pages/SharedInbox.jsx`
- `src/pages/SharedRoutes.test.jsx`
- `supabase/migrations/20261008051711_nom_friends.sql`

The map, chrome, experience/global/hub/Surprise spacing CSS, Surprise badge text, map tests, geometry test and surgical UI report belong to the first task. Other changes belong to the separate Friends task. Existing external-sharing tests now click Share; the account test mock rejects unsupported RPCs instead of treating them as dish-view writes. All pre-existing work outside these files is byte-for-byte unchanged. Earlier legitimate edits inside the modified files were retained; changes were limited to the reviewed local patches.

## Final validation record

- Full Vitest: **1,360 PASS / 84 files**.
- Focused UI/Friends suite: **84 PASS / 8 files** (includes **18 actual PostgreSQL social schema/RLS/RPC checks**).
- Python: **74 PASS**.
- Production build, 201-dish catalog validation/import check, source/generated-browser credential scans and `git diff --check`: **PASS**.
- `npm audit`: **0 vulnerabilities**, dependency/lock files unchanged.
- Friends migration SHA-256: `9f06bf2e6a86ed234f054aeb906901d05e6baae31cbcbc570a746f5ddd9e3af9`.
- Previously applied verification migration still SHA-256 `2536fad85cb540e4242a0156b7a49d4b88a3cb97f6b7dda28c0a813228ce7d75`.
- HEAD, index and ignored `.env.local` fingerprints unchanged; no existing files removed. Unrelated catalog, Home, Welcome, auth/sync, verification/rewards, prior route-recovery and environment/configuration files remain byte-for-byte unchanged from the current-turn baseline. No real Supabase users/data were created or mutated; disposable PGlite databases are closed after tests.
