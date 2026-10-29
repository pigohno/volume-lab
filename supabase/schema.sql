-- Volume Lab 스키마 — Supabase SQL Editor에 그대로 붙여넣고 Run 하시면 됩니다.
-- 다른 프로젝트와 Supabase를 같이 쓰기 때문에, 모든 테이블에 vl_ 접두사를 붙여 겹치지 않게 했습니다.
-- 기존 테이블은 건드리지 않습니다 (create if not exists, 정책도 vl_ 테이블에만 적용).
-- 모든 테이블은 RLS로 "본인 데이터만" 읽고 쓰도록 막혀 있고, shares만 링크를 아는 누구나 읽을 수 있습니다.

create table if not exists public.vl_workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  exercise_id text not null,
  sets jsonb not null default '[]'::jsonb,
  stimulated text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists vl_workouts_user_date on public.vl_workouts (user_id, date desc);

create table if not exists public.vl_meals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  food jsonb not null,
  servings numeric(6,2) not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists vl_meals_user_date on public.vl_meals (user_id, date desc);

create table if not exists public.vl_inbody (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight numeric(5,1) not null,
  skeletal_muscle numeric(5,1),
  body_fat_mass numeric(5,1),
  body_fat_pct numeric(4,1),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists vl_inbody_user_date on public.vl_inbody (user_id, date desc);

create table if not exists public.vl_goals (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  goals jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.vl_custom_foods (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null
);

create table if not exists public.vl_custom_exercises (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null
);

create table if not exists public.vl_shares (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('volume','diet','inbody')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- ───── RLS ─────
do $$
declare t text;
begin
  foreach t in array array['vl_workouts','vl_meals','vl_inbody','vl_goals','vl_custom_foods','vl_custom_exercises','vl_shares'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- 공유 링크는 로그인하지 않은 사람도 열람 가능 (읽기 전용)
drop policy if exists "public read" on public.vl_shares;
create policy "public read" on public.vl_shares for select to anon, authenticated using (true);
