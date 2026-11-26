# Architecture

## Principles

Windows-first native desktop, modular feature boundaries, least privilege, clear data ownership, and incremental delivery. The current shell is intentionally small. Do not introduce a service layer or sync engine until a real persistence use case is implemented.

## System shape

```text
Tauri 2 Windows application
  React + TypeScript UI
  ├─ feature modules and shared design system
  ├─ typed application services (to be introduced with persistence)
  └─ Tauri commands for narrowly scoped native operations
       ├─ OS-protected secrets / lock verification
       └─ SQLite cache (planned; encrypted sensitive fields)

Supabase project (planned)
  Auth ─ Postgres with RLS ─ Storage ─ Edge Functions
                                      └─ AI provider, server-side only
```

## Desktop architecture

`src/` owns presentation and user interactions. Keep business rules in typed feature modules as they become substantial. The UI must not hold privileged credentials or make arbitrary native calls. Use Tauri plugins or commands only for documented capabilities, scoped permissions, and validated inputs. The current Vite development server supports the React frontend; the product runtime is the Tauri desktop host.

## Backend architecture

Supabase Auth establishes identity. Every user-owned Postgres row will carry `user_id` and be protected by RLS policies that compare it with `auth.uid()`. Storage paths and policies must also bind media to the authenticated owner. Edge Functions are the boundary for privileged workflows, account operations that require server coordination, and AI requests. The desktop client receives only the project URL and publishable key.

## Data flow

The intended flow is UI → typed feature service → local repository / authorized Supabase API. Native operations cross a narrow Tauri command boundary. Inputs are validated at both the client boundary and the backend. RLS remains authoritative even when the UI hides or filters records.

## Synchronization (planned)

Start online-first with a local SQLite cache and explicit sync state. Introduce an outbox for offline writes, idempotent operation identifiers, retry/backoff, and per-record `updated_at`/version metadata. Specify conflict policy per entity before enabling offline edits; never silently overwrite diary or finance changes. Avoid building a general sync framework before the first persisted modules exist.

## AI (planned)

AI requests go through a server-side Edge Function. The `plan` function sends only the intent string provided by the user to Google's Gemini `generateContent` API and returns a schema-constrained draft for review. After success, the UI saves its goals, milestones, and tasks through the authenticated `save_ai_plan` Postgres function, which runs atomically under the user's RLS identity. Habits remain draft suggestions. No model-generated SQL or unrestricted database access is used.

## Environments

`.env.example` contains names and empty placeholders only. Local secrets belong in ignored `.env.local`; production builds must use a controlled build environment. Supabase project configuration contains no credentials. Do not commit local secrets or user data.
