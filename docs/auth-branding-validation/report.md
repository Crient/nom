# Nom Auth branding review

Local preparation completed October 6, 2026. No Auth/SMTP/Google/DNS/Vercel configuration was written, no email sent, no commit/push/deployment performed. Existing production release remains `f2d726662f44b54cf7204cb746dc742417579f3d`.

## Results

| Item | Status | Evidence and one required external action |
|---|---|---|
| Auth email branding | BLOCKED | Six Auth and seven optional security-notification templates, exact preferred subjects, and a restricted configuration patch are prepared and tested locally. Default SMTP remains in use, per owner confirmation. **Configure Nom custom SMTP using a verified Nom-owned sending domain and install the prepared templates in Nom Supabase.** |
| Google app branding | BLOCKED | Google provider/client/test user were previously owner-confirmed; connected tools cannot inspect Google Auth Platform branding or its verification state. **Complete and publish Nom's Google Auth Platform Branding configuration using the field list below.** |
| Removal of raw Supabase hostname | BLOCKED | Verified app branding may replace the consent display name; it does not change the actual Auth callback hostname. **Provision a Nom-owned Supabase custom domain with the corresponding Google callback and DNS setup as one coordinated, separately approved change.** |
| Privacy page | PASS | Existing public `/privacy` expanded and locally checked: optional accounts, separate Guest storage, account sync, Google identity, location, receipt OCR, retention, deletion and Places. Updated copy is not deployed. |
| Terms page | PASS | Existing public `/terms` expanded and locally checked: restaurant accuracy, verification limits, manual logging, daily credit, collectibles, connectivity and Google content. Updated copy is not deployed. |

Public launch still merits legal review, especially operator contact details, retention periods and any jurisdiction-specific requirements. These pages describe implemented behavior; they do not claim legal compliance, provider-wide non-retention, or immediate backup erasure.

## Google field list for the existing Nom OAuth client

| Field | Intended setting |
|---|---|
| Application name | `Nom` |
| User support email | Owner-selected monitored address available in the Google project; no invented support mailbox |
| Developer contact email | Owner-selected monitored address |
| App logo | Optional approved Nom logo in Google's accepted upload format; do not invent brand assets |
| Homepage | `https://nom-coral.vercel.app` now; owner-verified Nom domain for public brand verification |
| Privacy | `https://nom-coral.vercel.app/privacy` now; same owned domain as homepage when domain changes |
| Terms | `https://nom-coral.vercel.app/terms` now; same owned domain as homepage when domain changes |
| Production JavaScript origin | `https://nom-coral.vercel.app` |
| Current callback URI | `https://iwamwxsosrhxsdcsuoiu.supabase.co/auth/v1/callback` |
| Authorized domains | Domains required by the selected homepage/policy/origin/callback; claim ownership only where it can actually be verified |
| Scopes | `openid`, basic email/profile; no Gmail, Contacts, or additional API scopes |

Branding/Audience/testing versus production publishing are separate settings. Save does not establish that Google has verified and published branding. Public brand verification requires ownership evidence for associated domains; a shared service domain is not proof of Nom ownership. Follow Google's verification workflow and exceptions rather than asserting the current test app is production-verified. [Google brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification), [production authentication policy](https://developers.google.com/identity/verification/authentication-policy-compliance).

## Why Google displays the project hostname

The existing OAuth redirect is to Supabase's default project host. The observed screen is consistent with an unverified/default domain identity, but current Google branding state could not be inspected. Setting an app name alone does not prove that Google's published UI changes. Verified branding can show the app name/logo; a custom Auth domain gives the actual callback a recognizable Nom hostname. [Supabase Google branding guidance](https://supabase.com/docs/guides/auth/social-login/auth-google).

Supabase custom domains are a paid add-on on a paid plan and require a domain controlled by the owner plus DNS/certificate verification. They affect project endpoints, including Auth. Before activating a new `auth.` hostname on an owner-supplied domain, add its `/auth/v1/callback` in Google alongside the current callback. Coordinate frontend public URL, trusted server Supabase URL checks in the account/verification handlers, and production allowlists; retain the current callback through validation. No alternate domain or callback has been configured here. [Supabase custom-domain requirements and rollout order](https://supabase.com/docs/guides/platform/custom-domains).

## Branding and privacy boundary

Ordinary account screens use Nom/account/journey/Synced copy and mapped errors. Verification simulation copy is limited to isolated QA tooling. SDK network endpoints still contain infrastructure hostnames because they are real service endpoints, not product branding. The privacy page names Supabase and Google deliberately to disclose service processing accurately. Developer documentation and QA labels retain useful infrastructure detail.

Known hardening follow-up: rotate the Google OAuth client secret previously exposed in a screenshot through an owner-approved coordinated Google/Supabase update. No credential was retrieved, displayed, committed, or rotated in this pass.
