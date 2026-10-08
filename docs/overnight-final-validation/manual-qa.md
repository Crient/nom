# Remaining human/device QA — October 7, 2026

**Not executed tonight.** Browser discovery returned “No browser is available” and an empty list. Happy DOM tests do not measure layout, paint, camera support, audio audibility or actual browser history/network delivery. No new account emails or billable provider calls were made. Keep this as the human QA checklist, not PASS evidence.

## Local UI review, no remote rollout needed

Use the existing localhost app or ordinary `npm run dev`. No automatic new feature/design changes are required. At **360, 375, 390, 430, 440 px and desktop**:

1. Open `/` and reload. Confirm original mobile-first Welcome, mascot/wordmark, Continue as Guest / Stay on this device., Sign in or create account / Sync across devices. Check 360 px helper/CTA wrapping and fixed-height sheet/navigation for overlap, including a short viewport and browser zoom. Scroll to reach all controls. No desktop marketing sidebar.
2. Fresh isolated browser profile: Continue as Guest → richer Home, four icon quick actions, original zero progress cards, Mystery Box content and empty Recently Explored. Profile, History, Favorites and Collection contain no earned/demo/account data. Returning real Guest preserves legitimate local data; do not clear your personal browser storage to run this.
3. Ordinary dev has no fake 9:41/Wi-Fi/signal/battery. Separately run `VITE_NOM_DESIGN_PREVIEW=true npm run dev` on a different local port to confirm explicit design chrome. Production build must ignore the preview flag. Avoid restarting or replacing an existing dev process without choosing to do so.
4. Home and Explore search: empty/no X, typed/exactly one X, mouse/touch/keyboard activation, clear retains focus, Enter and Home arrow submit, selected Explore filters survive clearing. Check no results, accented/special text, emoji and a very long query for horizontal overflow.
5. Let's Eat: all four normal discovery steps and back navigation. Open a saved/shared Google restaurant link with no answers; finish discovery and return to that exact restaurant (the overnight fix). No external/malformed return destination should be accepted.
6. Home → Surprise me → deck without questionnaire/direct-dish jump. Swipe at least 25 times, Undo, skip/select/open, Back and reload. Check card/image pairing, promotion flicker, keyboard focus, touch-axis handling and reduced motion. Existing normal discovery answers should remain unchanged.
7. Search/Explore → Details → Nearby → Restaurant Details: check original cards, Share / Send to a friend, directions/contact availability, heart, info and I Ate Here. Send to a friend currently shows an honest coming-soon notice; it does not send a message. Call/Website can be unavailable when Google provides none. Do not treat absent contact data as a fake successful action.
8. I Ate Here → verification: no GPS/camera permission prompt on entry. Explicit Verify my location with the presently unconfigured server shows unavailable and keeps Continue disabled. Log without verification → confirm no-reward warning → feedback → logged → History. Check exact unverified status and zero reward/collectible credit across reload.
9. With a legitimately earned local box, test Open gesture, default sound, saved mute, unmute/replay, browser audio refusal, rapid taps, interrupted opening, reload/opening/reveal URLs and reduced motion. No second reward/event. Use isolated local QA only if explicitly enabled; it must not affect real Guest/account state.
10. Collection/Profile/History/Favorites/Progress: empty and legitimate returning states, info modals, Escape/focus restoration, scroll, labels and images. Inspect locked/upcoming art and hidden CTA/modal overflow without redesigning them.
11. Direct routes and Back: unknown routes currently replace to Home; invalid dish with completed answers returns to recommendations. Invalid visits/boxes/collections and locked collectibles show explanatory states. Decide later whether the two silent fallbacks need product copy; no new Not Found design was added tonight.

## After separately approved account/verification configuration

Local development currently lacks the Nom public Supabase URL/key and server secret. Account UI can be reviewed in unavailable mode; real account validation needs approved configuration. Do not copy Production credentials into Preview casually.

- Google initiation and controlled email login, session restoration, signout, Guest merge/account-only choices, two identities and a second device. Test offline favorites/manual meals → reconnect → hydration without reupload. Account deletion requires an approved disposable account only; never delete the owner's account.
- Existing confirmation/reset callback handlers with valid PKCE state in the originating browser. Reset form reload after code consumption currently needs a new recovery flow because the URL code is removed; evaluate recovery UX separately. Do not send extra emails solely for this checklist without need/approval.
- Approved migration/revision plus matching app/public signing key: actual schema/RLS, signed proof claim, one-dish/UTC-day credit, legacy reward migration, account/Guest adoption, retry/replay and deletion cascade. Run security/performance advisors and remove disposable remote fixtures after approval.
- Real GPS at trusted restaurant: inside/outside/boundary, denied, stale, poor accuracy, timeout; attempt another restaurant and duplicate request. Browser GPS can be spoofed; this implementation is not hardware attestation or proof of a dish purchase.
- QR only after a real participating-place allowlist and trusted operator issuer exist: fresh signed code, camera permission/support, timeout/cancel, wrong venue, expiry and nonce replay. BarcodeDetector support must be verified on the intended iOS/Android browsers; no alternate scanner was installed tonight.
- Receipt only after owner approves Vision billing/API-restricted credential, server-only configuration and quotas: one controlled merchant/branch/recent-date receipt, wrong/old/unreadable upload and retry. Raw images/OCR must not leak or become public. No actual Vision call occurred tonight.
- Review OAuth secret rotation following the previously exposed screenshot, as a separately approved hardening step. Do not confuse it with rotating the Supabase signing-secret-derived proof keys, which requires a historical-proof/claim preservation plan.

## Exit criteria

Local restored UI review can begin now. Verification rollout is not approved or ready until the migration compatibility/legacy reward decisions in [migration-review.md](migration-review.md) are resolved. A rendered/browser PASS and an actual Supabase/provider PASS require evidence from those environments; the local tests cannot substitute for either.
