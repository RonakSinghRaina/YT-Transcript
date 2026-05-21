-- Run in Supabase SQL Editor if profiles already exists without display_name
alter table public.profiles add column if not exists display_name text;
