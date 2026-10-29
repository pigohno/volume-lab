import { NextResponse, type NextRequest } from "next/server";
import { mfdsEnabled, searchMfds } from "@/lib/mfds";

// 식약처 DB 검색 프록시 — API 키를 브라우저에 노출하지 않기 위해 서버에서 호출합니다.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!mfdsEnabled()) return NextResponse.json({ enabled: false, items: [] });
  if (q.length < 1) return NextResponse.json({ enabled: true, items: [] });
  try {
    const items = await searchMfds(q);
    return NextResponse.json(
      { enabled: true, items },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (e) {
    return NextResponse.json({ enabled: true, items: [], error: (e as Error).message }, { status: 502 });
  }
}
