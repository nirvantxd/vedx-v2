# Roadmap

## Stage 1 — Foundation (in progress)

- [x] Inspect Node, npm, Git, Rust, WebView2, existing VedX directory.
- [x] Create a separate clean VedX V2 repository; preserve existing directory.
- [x] Tauri 2 + React + TypeScript + Vite foundation.
- [x] Tailwind CSS integration and initial design system.
- [x] Responsive desktop shell and working in-memory task interactions.
- [x] Product, architecture, security, database, AI, decisions, and roadmap docs.
- [x] Supabase local config and secret-free environment template.
- [x] Install Rust stable/MSVC toolchain.
- [x] Finish C++ Build Tools/Windows SDK installation.
- [x] Run and verify the native Tauri app (`npm run tauri dev`).
- [ ] Replace generated application icons and add native branding.

## Stage 2 — Authentication

- [ ] Configure a Supabase project and local CLI workflow.
- [ ] Signup, verification, login, logout, password recovery, session expiry/revocation.
- [ ] Secure token storage and account settings.
- [ ] Auth flow tests; credentials supplied through environment, never source.

## Stage 3 — Security

- [ ] Threat review of native capabilities and CSP.
- [ ] Native PIN verification, five-minute default idle lock, manual lock, throttle.
- [ ] Investigate Windows Hello and Windows-protected secret storage.
- [ ] Security review and RLS tests.

## Stage 4 — Core product

- [x] Tasks with cloud persistence, search, completion, and removal.
- [ ] Habits and accurate historical completion.
- [x] Goals and milestones with per-user cloud access.
- [ ] Calendar events and task/deadline views.
- [ ] Dashboard sourced only from persisted records.

## Stage 5 — Other modules

- [ ] Study, fitness, nutrition, finance, diary, notes, achievements.

## Stage 6 — Synchronization

- [ ] SQLite cache and Windows-protected encryption key.
- [ ] Outbox, idempotent retries, sync status, recovery.
- [ ] Entity-specific conflict resolution and offline tests.

## Stage 7 — AI

- [x] Scaffold authenticated Gemini Edge Function for review-only plan drafts.
- [x] Add bounded request parsing, strict plan validation, and contract tests.
- [ ] Add Gemini key to local/hosted Supabase secret store and test a live request.
- [ ] Connect desktop intent/review UI after Supabase auth is implemented.
- [ ] Typed planning tools, authorization, validation, approval UI, audit history.
- [ ] Progress review with consent and data minimization.

The live endpoint is not ready for deployment until per-user rate limits and a provider spending limit are configured.

## Stage 8 — Export

- [ ] JSON and per-module CSV export, media ZIP, import/restore, deletion flow.

## Stage 9 — Release

- [ ] Full tests, security review, Windows installer, signing/release docs, support diagnostics.

## This iteration

Frontend production build is the first verification target. Native compilation cannot proceed until Rust and MSVC prerequisites are installed.
