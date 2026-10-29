import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseEnabled) throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  if (!client) client = createBrowserClient(url!, anon!);
  return client;
}
