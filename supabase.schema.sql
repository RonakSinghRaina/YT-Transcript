create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  trial_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;

create table if not exists public.transcript_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null,
  video_id text,
  title text,
  transcript text not null,
  actor_run_id text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transcript_history enable row level security;

create policy "Users can read their profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read their transcript history"
on public.transcript_history for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their transcript history"
on public.transcript_history for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their transcript history"
on public.transcript_history for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists transcript_history_user_created_idx
on public.transcript_history(user_id, created_at desc);

create index if not exists transcript_history_user_favorite_idx
on public.transcript_history(user_id, is_favorite)
where is_favorite = true;
