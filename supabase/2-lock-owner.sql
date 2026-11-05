-- ② Volume Lab을 대표님 계정 전용으로 잠그기
-- 바꾸는 범위: vl_ 로 시작하는 Volume Lab 표의 보안 정책만. 같은 Supabase를 쓰는 다른 앱은 건드리지 않아요.
-- 여러 번 실행해도 괜찮아요.

-- ▼ 로그인할 때 쓰는 이메일이 다르면 이 한 줄만 바꿔 주세요.
do $$
declare
  owner_email text := 'pigohno@gmail.com';
  owner_id uuid;
  t text;
begin
  select id into owner_id from auth.users where lower(email) = lower(owner_email);
  if owner_id is null then
    raise exception '이메일 % 로 가입된 계정이 없어요. 위 owner_email을 확인해 주세요.', owner_email;
  end if;

  -- 소유자 표
  create table if not exists public.vl_owner (
    user_id uuid primary key references auth.users on delete cascade
  );
  delete from public.vl_owner;
  insert into public.vl_owner (user_id) values (owner_id);

  alter table public.vl_owner enable row level security;
  drop policy if exists "read self" on public.vl_owner;
  create policy "read self" on public.vl_owner for select to authenticated using (user_id = auth.uid());

  -- 기록 표: 본인 + 소유자일 때만 읽고 쓰기
  foreach t in array array['vl_workouts','vl_meals','vl_inbody','vl_goals','vl_custom_foods','vl_custom_exercises','vl_shares'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('drop policy if exists "owner only" on public.%I', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated
         using (user_id = auth.uid() and exists (select 1 from public.vl_owner o where o.user_id = auth.uid()))
         with check (user_id = auth.uid() and exists (select 1 from public.vl_owner o where o.user_id = auth.uid()))',
      t
    );
  end loop;

  raise notice '잠금 완료: % 계정만 Volume Lab을 쓸 수 있어요.', owner_email;
end $$;

-- 공유 링크 열람(읽기 전용)은 그대로 둡니다. ("public read" 정책)

notify pgrst, 'reload schema';

-- ③ (선택) 다른 사람이 남긴 Volume Lab 기록 지우기 — 확인 후에만 주석을 풀고 실행하세요.
-- 다른 앱의 계정 자체는 지우지 않고, vl_ 표의 기록만 지웁니다.
-- delete from public.vl_workouts         where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_meals            where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_inbody           where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_goals            where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_custom_foods     where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_custom_exercises where user_id not in (select user_id from public.vl_owner);
-- delete from public.vl_shares           where user_id not in (select user_id from public.vl_owner);
