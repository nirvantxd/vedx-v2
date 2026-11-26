# Product specification

## Vision

VedX is a private personal operating system that connects planning, execution, and reflection across tasks, habits, goals, study, fitness, nutrition, finance, diary, notes, calendar, achievements, and personal analytics. Future AI turns a user's intent into a reviewable plan and performs only approved, authorized actions.

## Product principles

- Calm and useful before feature-dense.
- The user owns and can export their data.
- Progress indicators must be based on real records; never invent analytics or streaks.
- AI proposes and explains; the user approves meaningful changes.
- Finance and personal writing receive strong access controls.

## Initial MVP scope

1. Windows desktop foundation and design system.
2. Email authentication and account recovery.
3. Application lock and secure local secrets.
4. Persisted tasks, habits, goals, and calendar.
5. RLS-protected cloud data and basic sync.
6. User data export.

## Modules

- **Dashboard:** real daily tasks, habit completion, goals, study/fitness/finance summaries, upcoming events, and quick actions. User-customizable later.
- **Tasks:** title, notes, priority, due date, categories, recurrence, status, goal/calendar links, filtering, sorting.
- **Habits:** daily/weekly/custom schedules, records, notes, history, accurate streaks and analytics.
- **Goals:** description, category, target date, status, measurable progress, milestones, linked tasks/habits, review.
- **Study:** subjects, goals, sessions, notes, history.
- **Fitness:** workouts, exercises, sets/reps/weight, history, personal records. Never auto-write a workout.
- **Nutrition:** meals, foods, nutrition facts, optional calorie/macronutrient tracking.
- **Finance:** income, expenses, categories, monthly view, savings goals, debts; private by default.
- **Diary:** dated text/reflections/media, editing and search; personal scrapbook-like presentation.
- **Notes:** searchable, categorized Markdown/rich text.
- **Calendar:** user events, tasks, goal dates, and planned activities.
- **Achievements:** meaningful records based on completed milestones, never forced gamification.
- **AI assistant:** authorized retrieval and typed plan proposals with review and approval.

## Current shell behavior

Overview, Tasks, Goals, and AI Planner are connected to Supabase. Sign-in remembers only the email address and always requires the password. First sign-in collects a name, age, and profession in a private Supabase profile; the app shares those details with Gemini for planning personalization and discloses this in the UI. Manual tasks and plans from successful AI requests save to the signed-in user's RLS-protected tables. AI plans save goals, milestones, and tasks and report the saved counts. Authentication sessions are held in memory and require a new sign-in after restarting the app. Other module screens communicate that they are planned; they do not claim to save data.

## Design direction

Windows desktop-first, light neutral surfaces, royal blue primary accent, purple secondary accent, clear hierarchy, restrained motion, keyboard-friendly controls, and responsive layouts for common desktop widths. Use native system typography and avoid remote font dependencies. Dark mode follows after the core tokens and contrast rules are established.
