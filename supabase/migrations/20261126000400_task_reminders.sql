alter table public.tasks
  add column if not exists reminder_time time,
  add column if not exists repeat_daily boolean not null default false,
  add column if not exists completed_on date;
