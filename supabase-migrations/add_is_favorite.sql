alter table public.transcript_history
  add column if not exists is_favorite boolean not null default false;

create index if not exists transcript_history_user_favorite_idx
  on public.transcript_history(user_id, is_favorite)
  where is_favorite = true;

drop policy if exists "Users can update their transcript history" on public.transcript_history;

create policy "Users can update their transcript history"
on public.transcript_history for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
