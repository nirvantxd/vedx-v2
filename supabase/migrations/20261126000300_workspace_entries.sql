create table public.workspace_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('study','fitness','nutrition','finance','diary','notes','calendar','habits')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  entry_date date not null default current_date,
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_entries_user_kind_date_idx
  on public.workspace_entries (user_id, kind, entry_date desc, created_at desc);

alter table public.workspace_entries enable row level security;

create policy "Users can read their own workspace entries"
  on public.workspace_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can create their own workspace entries"
  on public.workspace_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can update their own workspace entries"
  on public.workspace_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete their own workspace entries"
  on public.workspace_entries for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.workspace_entries to authenticated;
