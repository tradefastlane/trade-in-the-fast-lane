create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 10),
  snapshot jsonb not null,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_code_idx on public.games (code);

create or replace function public.touch_games_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
before update on public.games
for each row execute function public.touch_games_updated_at();

alter table public.games enable row level security;

drop policy if exists "authenticated users can create games" on public.games;
create policy "authenticated users can create games"
on public.games
for insert
to authenticated
with check (
  snapshot -> 'players' ? (select auth.uid()::text)
);

drop policy if exists "players can read games and guests can inspect lobbies" on public.games;
create policy "players can read games and guests can inspect lobbies"
on public.games
for select
to authenticated
using (
  snapshot -> 'players' ? (select auth.uid()::text)
  or snapshot ->> 'status' = 'lobby'
);

drop policy if exists "players can update games and guests can join lobbies" on public.games;
create policy "players can update games and guests can join lobbies"
on public.games
for update
to authenticated
using (
  snapshot -> 'players' ? (select auth.uid()::text)
  or snapshot ->> 'status' = 'lobby'
)
with check (
  snapshot -> 'players' ? (select auth.uid()::text)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end
$$;

comment on table public.games is
  'Prototype realtime game snapshots. The application uses optimistic version checks to avoid overwriting simultaneous player actions.';
