import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anon);

let client: SupabaseClient | null = null;

/**
 * 서버 렌더링에서 로그인을 쓰지 않는 앱이라, 쿠키 대신 브라우저 저장소에 세션을 둡니다.
 * (쿠키 방식은 iOS Safari에서 7일 만료·분할 쿠키 문제로 세션이 깨지는 경우가 있었습니다.)
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseEnabled) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  if (!client)
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "volume-lab-auth",
      },
    });
  return client;
}

/** 토큰 만료·세션 문제로 난 에러인지 */
export function isAuthError(e: unknown) {
  const m = String((e as Error)?.message ?? e).toLowerCase();
  return /jwt|token|expired|invalid claim|not authenticated|unauthori[sz]ed|401/.test(m);
}
