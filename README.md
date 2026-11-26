# VedX V2

VedX is a Windows-first personal operating system for planning, doing, and reviewing the parts of life that matter. This repository is a clean V2 foundation; the existing `vedx-app` directory was left untouched.

## Current status

The desktop shell is built with Tauri 2, React, TypeScript, Vite, and Tailwind CSS. It includes Supabase email/password sign-in, a hosted Gemini planning Edge Function, and RLS-protected cloud persistence for profiles, goals, milestones, and tasks. VedX remembers the email on the device but never stores the password; sign in again after reopening the app. The first sign-in asks for a name, age, and profession, saves them to a private profile, and passes them to Gemini with each planning request. Successfully generated AI plans save their goals and tasks automatically. Other navigation areas show their current foundation status and are not represented as implemented modules.

App lock and broader sync remain unimplemented. Live AI generation requires `GEMINI_API_KEY` in the Supabase project's Edge Function Secrets. See [the roadmap](docs/ROADMAP.md) for scope and dependencies.

## Requirements

- Windows 10/11, WebView2 Runtime
- Node.js 20.19+ or 22.12+ (Vite 8 requires a supported modern Node release)
- Rust stable toolchain with the MSVC target
- Microsoft C++ Build Tools (MSVC) and Windows SDK

The inspected machine has Node 26, npm 11, Git 2.56, WebView2, Rust stable, and Visual Studio Build Tools 2022. `npm run tauri dev` compiled and launched the native VedX window successfully.

## Setup

```powershell
git clone <repository-url>
cd vedx-v2
npm install
Copy-Item .env.example .env.local
```

Put only a project URL and publishable key in local frontend environment variables. Never put a service-role key or other privileged credential in this app.

For local function development, copy `supabase/functions/.env.example` to `supabase/functions/.env`, add your Gemini key there, and keep that local file untracked. For the hosted project, add `GEMINI_API_KEY` in Supabase Edge Function Secrets. Do not send the key in chat or put it in a `VITE_*` variable.

## Development

```powershell
npm run dev       # frontend preview in a browser
npm run build     # TypeScript check and production frontend build
npm run tauri dev # native desktop app; requires Rust and Windows build tools
```

## Windows build

After installing the prerequisites listed above:

```powershell
npm run tauri build
```

The installer output is written under `src-tauri/target/release/bundle/`.

## Project map

- `src/` — React desktop interface
- `src-tauri/` — Tauri 2 host and Windows bundle configuration
- `supabase/` — local Supabase development configuration and future migrations
- `supabase/functions/plan/` — authenticated, review-only Gemini planning endpoint
- `docs/` — product, architecture, security, database, AI, decision, and delivery notes

See [Architecture](docs/ARCHITECTURE.md), [Security](docs/SECURITY.md), and [Roadmap](docs/ROADMAP.md) before extending the foundation.
