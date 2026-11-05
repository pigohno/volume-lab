-- ① 누가 Volume Lab을 쓰고 있는지 확인 (읽기만 합니다. 아무것도 바꾸지 않아요)
-- Supabase → SQL Editor에 붙여넣고 Run

select
  u.email,
  u.created_at::date            as 가입일,
  u.last_sign_in_at::date       as 마지막_로그인,
  (select count(*) from public.vl_workouts w where w.user_id = u.id) as 운동기록,
  (select count(*) from public.vl_meals    m where m.user_id = u.id) as 식단기록,
  (select count(*) from public.vl_inbody   i where i.user_id = u.id) as 인바디,
  (select count(*) from public.vl_shares   s where s.user_id = u.id) as 공유링크
from auth.users u
where exists (select 1 from public.vl_workouts where user_id = u.id)
   or exists (select 1 from public.vl_meals    where user_id = u.id)
   or exists (select 1 from public.vl_inbody   where user_id = u.id)
   or exists (select 1 from public.vl_goals    where user_id = u.id)
   or exists (select 1 from public.vl_shares   where user_id = u.id)
order by 운동기록 desc;

-- 참고: 최근 7일 안에 가입한 계정 (공유 링크 보고 들어온 사람이 있는지)
-- select email, created_at, last_sign_in_at from auth.users
-- where created_at > now() - interval '7 days' order by created_at desc;
