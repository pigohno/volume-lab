import "server-only";
import type { FoodProduct } from "./types";

/**
 * 식약처 식품영양성분DB (공공데이터포털 "식품의약품안전처_식품영양성분DB정보")
 * 서버에서만 호출합니다. 키는 MFDS_API_KEY (일반 인증키 Decoding 값).
 * 영양성분은 NUTRI_AMOUNT_SERVING(보통 100g/100ml) 기준이라, 그 기준량을 1회 제공량으로 씁니다.
 */
const ENDPOINT = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

const F = {
  code: "FOOD_CD",
  name: "FOOD_NM_KR",
  maker: "MAKER_NM",
  category: "FOOD_CAT1_NM",
  basis: "NUTRI_AMOUNT_SERVING",
  kcal: "AMT_NUM1",
  protein: "AMT_NUM3",
  fat: "AMT_NUM4",
  carbs: "AMT_NUM6",
} as const;

type Raw = Record<string, unknown>;

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

function basisOf(v: unknown): { size: number; unit: "g" | "ml" } {
  const m = String(v ?? "").match(/(\d+(?:\.\d+)?)\s*(g|ml|mL|㎖)/);
  if (!m) return { size: 100, unit: "g" };
  return { size: parseFloat(m[1]), unit: m[2].toLowerCase().startsWith("g") ? "g" : "ml" };
}

function itemsOf(json: unknown): Raw[] {
  const j = json as { body?: { items?: unknown }; response?: { body?: { items?: unknown } } };
  const items = (j.body ?? j.response?.body)?.items as unknown;
  if (Array.isArray(items)) return items as Raw[];
  const inner = (items as { item?: unknown } | undefined)?.item;
  if (Array.isArray(inner)) return inner as Raw[];
  if (inner && typeof inner === "object") return [inner as Raw];
  return [];
}

export const mfdsEnabled = () => Boolean(process.env.MFDS_API_KEY);

export async function searchMfds(q: string, rows = 30): Promise<FoodProduct[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", process.env.MFDS_API_KEY ?? "");
  url.searchParams.set("FOOD_NM_KR", q);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(rows));
  url.searchParams.set("type", "json");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`식약처 API ${res.status}`);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const m = text.match(/<returnAuthMsg>([^<]+)</) ?? text.match(/<errMsg>([^<]+)</);
    throw new Error(m ? `식약처 API: ${m[1]}` : "식약처 API 응답 형식 오류");
  }

  return itemsOf(json).map((r, i) => {
    const b = basisOf(r[F.basis]);
    const maker = String(r[F.maker] ?? "").trim();
    return {
      id: `mfds-${String(r[F.code] ?? `${q}-${i}`)}`,
      name: String(r[F.name] ?? "").trim(),
      brand: maker && maker !== "해당없음" ? maker : undefined,
      category: String(r[F.category] ?? "식약처 DB").trim() || "식약처 DB",
      servingSize: b.size,
      servingUnit: b.unit,
      kcal: num(r[F.kcal]),
      protein: num(r[F.protein]),
      carbs: num(r[F.carbs]),
      fat: num(r[F.fat]),
      source: "mfds" as const,
    };
  });
}
