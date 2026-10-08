# Nom Auth email templates (review only)

These files have not been installed remotely. Target only **Nom / iwamwxsosrhxsdcsuoiu**. Remote configuration writes require owner approval.

The six Auth templates cover confirmation, recovery, email change, invitation, magic link, and reauthentication. Seven notification templates cover password/email/phone changes, linked/unlinked identities, and enrolled/unenrolled MFA factors if those notifications are already enabled. Do not enable unused providers, notifications, invitation flows, or MFA merely to install branding.

`subjects.json` maps files to subjects. `config-patch.json` is a reviewable Management API payload containing only template bodies and subjects, with no credentials, SMTP settings, provider toggles, Site URL, or redirect allowlist changes. Alternatively paste each subject/body into the corresponding **Nom → Authentication → Email Templates** entry. Existing settings must be backed up securely by the operator before approved application.

The link templates retain `{{ .ConfirmationURL }}`; reauthentication retains `{{ .Token }}`. This keeps Supabase's token and redirect handling. Existing signup/OAuth returns through `https://nom-coral.vercel.app/auth/callback`; recovery returns through `https://nom-coral.vercel.app/account/reset-password`. Do not replace token-aware links with a bare homepage, or change confirmation/security behavior. Disable SMTP provider link tracking so it cannot rewrite one-time links.

Template content can be customized independently of SMTP. A production Nom sender identity needs custom SMTP with a verified domain actually owned by Nom: sender display name **Nom**, an owner-selected `no-reply@` address on that domain, provider host/port/user/password, and provider-required SPF/DKIM/DMARC DNS records. No owned domain or SMTP credentials were supplied, so no sender address has been invented. Enter credentials only in the provider and Nom Supabase dashboard; never in these files or chat.

After owner-approved setup, test one controlled confirmation and one recovery email, their displayed sender/subject/body and correct return routes. Avoid repeated default-mailer requests. Invitation/magic-link/reauthentication/notification templates are prepared without claiming those flows are enabled or live-tested.

Sources: [Supabase email template variables and configuration](https://supabase.com/docs/guides/auth/auth-email-templates), [custom SMTP and sender configuration](https://supabase.com/docs/guides/auth/auth-smtp).
