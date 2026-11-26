# AI agent architecture

## Status

The backend planning function at `supabase/functions/plan/index.ts` accepts an intent and the signed-in user's name, age, and profession, and calls Google's Gemini API from the Edge Function. It returns a schema-constrained draft with goals, milestones, habits, tasks, assumptions, and questions. It does not read VedX records or expose model tools. The UI saves goals, milestones, and tasks through the authenticated database function after generation.

This is a development scaffold, not ready for public deployment. Add persistent per-user request limits, provider spend limits, monitoring, and abuse controls before exposing the endpoint to users.

## Proposed flow

Desktop UI → authenticated Edge Function → Gemini `generateContent` API. The function requires a valid Supabase user JWT, accepts only an intent and bounded profile fields, uses structured JSON output, caps input/output, and validates the returned plan server-side. The Gemini key is read only from the function's server environment. The UI tells users that their profile and intent are sent to Google Gemini when they request a plan.

When the UI is connected, make clear that the submitted intent is sent to Google Gemini. Review Google's current data controls, retention terms, and the user's privacy choices before release.

## Tools and permissions

Future tools such as `list_user_tasks` and `summarize_progress` must have strict schemas, size limits, ownership checks, and explicit read/write scopes. Any create/update tools must route through application services after approval. The current function has no tools and models never call SQL or arbitrary URLs.

## Approval

The response is marked `requires_review: true` and is displayed as a reviewable draft. On successful generation, the current UI automatically saves its goals, milestones, and tasks to the signed-in user's private Supabase workspace, then displays the saved counts. Habits remain suggestions in the draft and are not persisted yet. Require stronger confirmation for deletes, finance, diary/media access, bulk changes, or actions that affect other systems. Record outcomes without logging private prompt content unnecessarily.

## Safety boundaries

- Respect account authorization and application lock state.
- Recheck authorization and record ownership at execution time.
- Treat diary, notes, and imported content as untrusted prompt input.
- Do not let content instruct the model to broaden permissions.
- Do not silently overwrite workouts or execute destructive actions.
- Offer data minimization and clearly scoped context selection.

## Rollout

Begin with read-only, user-selected context summaries; then typed proposals; then approval-gated writes. Add auditability, rate limits, privacy controls, and evaluation cases before enabling broader actions.
