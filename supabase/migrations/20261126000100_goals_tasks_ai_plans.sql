create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null check (category in ('personal', 'study', 'fitness', 'nutrition', 'finance', 'career', 'wellbeing', 'other')),
  desired_outcome text not null check (char_length(btrim(desired_outcome)) between 1 and 500),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'archived')),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create index goals_user_status_created_idx on public.goals (user_id, status, created_at desc);

alter table public.goals enable row level security;

create policy "Users can read their own goals"
  on public.goals for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own goals"
  on public.goals for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own goals"
  on public.goals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own goals"
  on public.goals for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  target_date date,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade
);

create index goal_milestones_user_goal_idx on public.goal_milestones (user_id, goal_id, created_at);

alter table public.goal_milestones enable row level security;

create policy "Users can read their own goal milestones"
  on public.goal_milestones for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own goal milestones"
  on public.goal_milestones for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own goal milestones"
  on public.goal_milestones for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own goal milestones"
  on public.goal_milestones for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null default 'personal' check (category in ('personal', 'study', 'fitness', 'nutrition', 'finance', 'career', 'wellbeing', 'other')),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete set null (goal_id)
);

create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date, created_at desc);

alter table public.tasks enable row level security;

create policy "Users can read their own tasks"
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own tasks"
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own tasks"
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own tasks"
  on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.save_ai_plan(p_goals jsonb, p_tasks jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal jsonb;
  v_milestone jsonb;
  v_task jsonb;
  v_goal_id uuid;
  v_goal_count integer := 0;
  v_milestone_count integer := 0;
  v_task_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to save a plan.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_goals) <> 'array' or jsonb_array_length(p_goals) > 3 then
    raise exception 'A plan can contain at most three goals.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) > 8 then
    raise exception 'A plan can contain at most eight tasks.' using errcode = '22023';
  end if;

  for v_goal in select value from jsonb_array_elements(p_goals)
  loop
    insert into public.goals (user_id, title, category, desired_outcome, target_date, source)
    values (
      v_user_id,
      v_goal ->> 'title',
      v_goal ->> 'category',
      v_goal ->> 'desired_outcome',
      nullif(v_goal ->> 'target_date', '')::date,
      'ai'
    )
    returning id into v_goal_id;
    v_goal_count := v_goal_count + 1;

    if jsonb_typeof(v_goal -> 'milestones') = 'array' then
      for v_milestone in select value from jsonb_array_elements(v_goal -> 'milestones')
      loop
        insert into public.goal_milestones (user_id, goal_id, title, target_date)
        values (
          v_user_id,
          v_goal_id,
          v_milestone ->> 'title',
          nullif(v_milestone ->> 'target_date', '')::date
        );
        v_milestone_count := v_milestone_count + 1;
      end loop;
    end if;
  end loop;

  for v_task in select value from jsonb_array_elements(p_tasks)
  loop
    insert into public.tasks (user_id, title, due_date, source)
    values (
      v_user_id,
      v_task ->> 'title',
      nullif(v_task ->> 'due_date', '')::date,
      'ai'
    );
    v_task_count := v_task_count + 1;
  end loop;

  return jsonb_build_object(
    'goal_count', v_goal_count,
    'milestone_count', v_milestone_count,
    'task_count', v_task_count
  );
end;
$$;

revoke all on function public.save_ai_plan(jsonb, jsonb) from public;
grant execute on function public.save_ai_plan(jsonb, jsonb) to authenticated;

grant select, insert, update, delete on public.goals, public.goal_milestones, public.tasks to authenticated;
