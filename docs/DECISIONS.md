# Architecture decisions

## 2026-11-24 — Rebuild in a separate directory

**Decision:** create `vedx-v2` beside the existing `vedx-app` and do not reuse its code.  
**Reason:** the request calls for a rebuild from scratch and explicitly prohibits overwriting existing work. The old directory is a non-Git web bundle.  
**Alternatives:** replace or retrofit `vedx-app`; rejected because that risks losing existing work and couples a new architecture to legacy implementation.

## 2026-11-24 — Tauri 2 with React, TypeScript, Vite

**Decision:** use the requested native shell and frontend stack.  
**Reason:** it fits a Windows-first product and keeps interface development modular. Vite serves the UI during development; Tauri is the shipped application host.  
**Alternatives:** Electron or a browser-only app; not selected because the product is intended to be a Windows desktop application.

## 2026-11-24 — Incremental data architecture

**Decision:** defer database tables, SQLite, sync, authentication, and AI until the relevant feature is implemented.  
**Reason:** avoid speculative schema and complex untested offline infrastructure. Keep the planned ownership and trust boundaries documented.  
**Alternatives:** generate all module tables immediately; rejected due to premature commitments and absent backend project credentials.

## 2026-11-24 — Frontend shell uses in-memory task state

**Decision:** implement a small interactive task flow without persistence in the first shell.  
**Reason:** it demonstrates core navigation and task interaction while accurately limiting the claim to session-only state.  
**Alternatives:** use browser storage or introduce SQLite immediately; deferred until secure storage decisions are made.

## 2026-11-24 — Tailwind CSS 4 via Vite plugin

**Decision:** use the official Tailwind Vite integration with the CSS import entry point.  
**Reason:** minimal configuration for the React/Vite stack. Shared visual tokens and components are documented; hand-authored CSS provides the current detailed shell styling.
