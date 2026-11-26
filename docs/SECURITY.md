# Security

## Current security status

Supabase email/password accounts, RLS-protected profiles, goals, milestones, and tasks, and the Gemini planning Edge Function are implemented. Auth tokens are held in memory and require sign-in after restarting; only the email address is remembered locally. The user-provided name, age, profession, and planning intent are sent to Gemini on plan requests, as disclosed in the UI. AI-generated plans are saved automatically through an authenticated, atomic database function. App lock, OS-protected token storage, recovery, and rate/spending controls remain outstanding before public deployment. Tauri has a restrictive baseline Content Security Policy and scoped default capability. Review CSP when adding remote connections; allow only required destinations.

## Authentication (planned)

Use Supabase Auth email/password with verification, recovery, session refresh, and revocation. Prefer OS-protected token storage through a reviewed Tauri integration; do not put refresh tokens in localStorage or log credentials. Support MFA through the backend's supported flow. Email changes and account deletion require reauthentication and explicit confirmation.

## Application lock (planned)

The app lock is independent from the cloud session. Default idle timeout is five minutes, with manual lock, lock on resume/minimize as configured, throttled failures, and secure PIN verification using a native cryptographic implementation and per-install salt. Store verification material only in OS-protected storage; never plaintext PINs. Evaluate Windows Hello through a narrow native integration. A frontend-only PIN modal is not a security boundary. Sensitive operations require reauthentication where appropriate.

## Local data protection (planned)

Minimize local retention. Use SQLite for structured cache and a Windows-protected key to encrypt sensitive data at rest. Define backup, key loss, device removal, and cache purge behavior before storing diary or finance data. Avoid sensitive diagnostics and crash payloads.

## Backend and ownership

Every user-owned table must enable RLS and include explicit select/insert/update/delete policies tied to `auth.uid()`. Validate ownership and relationships at the database boundary. Storage policies must bind object paths to the authenticated user. Never ship a service-role key, private provider secret, or unrestricted API credential in the desktop app.

## AI boundaries (planned)

Use server-mediated requests. Expose narrow typed tools with input schemas and per-user authorization. Separate read and write scopes. Validate model output and show proposed changes before execution. Require approval for destructive, financial, privacy-sensitive, or bulk actions. Respect app lock and account revocation. Never execute generated SQL.

## Threat model and controls

Threats include another local user accessing an unlocked device, token theft, malicious client modification, cross-account data access, sync conflicts, accidental export leakage, and prompt injection through user content. Controls include Windows lock/screen timeout assumptions plus in-app lock, OS-protected secrets, minimal cache, RLS, scoped Tauri capabilities, validated APIs, explicit export destination, and approval-gated AI writes. Security tests and review are required before cloud release.
