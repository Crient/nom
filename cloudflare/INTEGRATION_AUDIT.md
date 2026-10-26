# Remaining Nom integrations — 26 October 2026

The Supabase transfer is complete and approved. No additional provider credentials were exported during this audit. Vercel is permanent; Cloudflare remains a temporary Preview.

| Integration | Actual implementation | Current evidence / blocker |
| --- | --- | --- |
| Authentication | Supabase email and Google OAuth with PKCE; return to this Preview's `/auth/callback` | Auth health/settings, public client initialization and intercepted PKCE initiation pass. Actual login is not certified. A real login can update Auth/session data and trigger account synchronization, so use owner-assisted review or separately approved synthetic-account testing. Do not edit existing accounts or redirect settings without authorization. |
| Restaurant search/details/photos | Google Places API (New); Text Search with rating/open-hours/photos and selected Details with reviews/editorial summary | An existing non-placeholder local `GOOGLE_PLACES_API_KEY` is present. It was not transmitted or tested. Cloudflare has no Places secret and returns NOT_CONFIGURED. The owning Google project's API restrictions, quotas and billing need read-only review before proposing a Preview transfer. |
| Receipt OCR | Google Cloud Vision `DOCUMENT_TEXT_DETECTION` | No `NOM_RECEIPT_OCR_API_KEY` was found in the inspected local settings or Vercel export. The actual implementation is Google Vision, not a generic free OCR endpoint. Do not enable Vision, create a key or substitute providers without reviewing cost and authorization. |
| Location / QR verification | Existing Supabase verification repository, Google restaurant details, signed proof / participating-restaurant list | Supabase zero-row readiness succeeds. Location needs Places; QR also needs the partner list. No `NOM_QR_PARTICIPATING_PLACES` was found. Malformed requests are rejected before budgets/grants. No real visits, rewards or meal records were created. |

Google bills Places at the highest requested field tier, and its API requires billing. Cloud Vision has a monthly free allowance but still uses a billing-enabled Google Cloud project. Neither allowance alone proves a strict zero-cost configuration. Existing app counters are per warm instance; they are not a global financial cap and cannot certify $0 across multiple Cloudflare instances. No Cloud billing/API/quotas/restrictions were changed, and no billable call was made.

Next concrete review: inspect the existing Google Cloud project's enabled APIs, key restrictions, SKU quotas and usage without revealing keys. Only after the owner reviews a precise zero-cost operating envelope should a separate approval authorize copying the existing Places key to this temporary Cloudflare Preview. OCR additionally needs an approved existing key or an explicitly chosen alternative. This audit does not request permission to activate billing.

The full restaurant → verified visit → synchronized meal/reward workflow is therefore not certified as live. Local/unit tests and nonmutating deployed validation pass; do not label them a successful live provider test. Preserve existing user data and use isolated fixtures until live mutations are explicitly authorized.

Primary sources checked:

- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- https://cloud.google.com/vision/pricing
- https://docs.cloud.google.com/vision/docs/setup
