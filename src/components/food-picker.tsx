"use client";

import * as React from "react";
import { ArrowLeft, Database, Loader2, Plus, Search, Sparkles } from "lucide-react";
import type { FoodProduct, MealSlot } from "@/lib/types";
import { SEED_FOODS } from "@/lib/data/foods";
import { multiTokenScore } from "@/lib/search";
import { useStore } from "@/lib/store/provider";
import { cn, fmt, round1, uid } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/exercise-picker";

export const MEAL_LABEL: Record<MealSlot, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

type SortKey = "match" | "protein" | "density";

/** 단백질 밀도: 100kcal당 단백질 g — 같은 칼로리로 단백질을 얼마나 채우는지 */
const density = (f: FoodProduct) => (f.kcal > 0 ? (f.protein / f.kcal) * 100 : 0);

function useMfds(q: string) {
  const [state, setState] = React.useState<{ enabled: boolean | null; items: FoodProduct[]; loading: boolean }>({
    enabled: null,
    items: [],
    loading: false,
  });
  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setState((s) => ({ ...s, items: [], loading: false }));
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      fetch(`/api/foods?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { enabled: boolean; items: FoodProduct[] }) => setState({ enabled: j.enabled, items: j.items, loading: false }))
        .catch(() => setState((s) => ({ ...s, loading: false })));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  return state;
}

export function FoodPicker({
  open,
  onOpenChange,
  date,
  defaultMeal,
  remainingProtein,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string;
  defaultMeal: MealSlot;
  remainingProtein: number;
}) {
  const { customFoods, meals, saveMeal, saveCustomFood } = useStore();
  const [q, setQ] = React.useState("");
  const [proteinTarget, setProteinTarget] = React.useState<string>("");
  const [sort, setSort] = React.useState<SortKey>("match");
  const [chosen, setChosen] = React.useState<FoodProduct | null>(null);
  const [creating, setCreating] = React.useState(false);
  const mfds = useMfds(q);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setProteinTarget("");
      setSort("match");
      setChosen(null);
      setCreating(false);
    }
  }, [open]);

  // 자주 먹은 음식은 검색어 없이도 바로 보이게
  const frequent = React.useMemo(() => {
    const m = new Map<string, { food: FoodProduct; n: number }>();
    for (const e of meals) {
      const k = e.food.id;
      m.set(k, { food: e.food, n: (m.get(k)?.n ?? 0) + 1 });
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 10).map((x) => x.food);
  }, [meals]);

  const target = Number(proteinTarget);
  const results = React.useMemo(() => {
    const pool = [...customFoods, ...SEED_FOODS, ...mfds.items];
    const seen = new Set<string>();
    const query = q.trim();
    let list = pool
      .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
      .map((f) => ({
        f,
        s: query ? multiTokenScore(query, [f.name, f.brand ?? "", f.category, `${f.brand ?? ""}${f.name}`]) : 1,
      }))
      .filter((x) => x.s > 10 || (!query && x.s > 0));

    if (target > 0) {
      // 단백질 g 검색: 1회 제공량 기준 ±30% 범위 안, 목표에 가까운 순
      list = list
        .filter((x) => Math.abs(x.f.protein - target) <= Math.max(3, target * 0.3))
        .map((x) => ({ ...x, s: x.s + 40 - Math.abs(x.f.protein - target) * 3 }));
    }
    if (!query && !(target > 0)) return frequent.length ? frequent : SEED_FOODS.slice(0, 20);

    if (sort === "protein") list.sort((a, b) => b.f.protein - a.f.protein);
    else if (sort === "density") list.sort((a, b) => density(b.f) - density(a.f));
    else list.sort((a, b) => b.s - a.s);
    return list.slice(0, 50).map((x) => x.f);
  }, [customFoods, mfds.items, q, target, sort, frequent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={chosen ? "얼마나 드셨어요?" : creating ? "직접 등록" : "음식 추가"}
        description={chosen || creating ? undefined : "상품명·브랜드 검색, 또는 단백질 g으로 찾기"}
        className="sm:h-[82dvh]"
      >
        {chosen ? (
          <AmountStep
            food={chosen}
            defaultMeal={defaultMeal}
            onBack={() => setChosen(null)}
            onSave={(meal, servings) => {
              saveMeal({ id: uid(), date, meal, food: chosen, servings, createdAt: new Date().toISOString() });
              onOpenChange(false);
            }}
          />
        ) : creating ? (
          <CustomFoodForm
            initialName={q}
            onCancel={() => setCreating(false)}
            onSave={(f) => {
              saveCustomFood(f);
              setCreating(false);
              setChosen(f);
            }}
          />
        ) : (
          <>
            <div className="sticky top-0 z-10 -mx-5 space-y-2 bg-popover px-5 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="예: 아임닭 소스, 그릭요거트, 셀렉스"
                  className="h-10 pl-9"
                />
                {mfds.loading && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex h-8 items-center gap-1 rounded-full border border-border bg-muted/60 pl-3 pr-1 text-xs text-muted-foreground">
                  단백질
                  <input
                    type="number"
                    inputMode="decimal"
                    value={proteinTarget}
                    onChange={(e) => setProteinTarget(e.target.value)}
                    placeholder="0"
                    className="num w-10 bg-transparent text-center text-foreground outline-none"
                    aria-label="찾을 단백질 g"
                  />
                  g 근처
                </div>
                {remainingProtein > 0 && (
                  <Chip
                    active={Number(proteinTarget) === Math.round(remainingProtein)}
                    onClick={() => setProteinTarget(String(Math.round(Math.min(remainingProtein, 60))))}
                  >
                    <Sparkles className="mr-1 inline size-3" />
                    남은 {Math.round(remainingProtein)}g 채우기
                  </Chip>
                )}
              </div>
              <div className="flex gap-1.5">
                {(
                  [
                    ["match", "추천순"],
                    ["protein", "단백질 많은 순"],
                    ["density", "칼로리 대비 단백질"],
                  ] as const
                ).map(([k, l]) => (
                  <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
                    {l}
                  </Chip>
                ))}
              </div>
            </div>

            {!q && !(target > 0) && (
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                {frequent.length ? "자주 먹은 음식" : "많이 찾는 음식"}
              </div>
            )}

            <ul className="-mx-2">
              {results.map((f) => (
                <li key={f.id}>
                  <FoodRow food={f} highlight={target > 0} onClick={() => setChosen(f)} />
                </li>
              ))}
            </ul>

            {results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {target > 0 ? `1회 제공량 기준 단백질 ${target}g 근처 상품이 없어요.` : "검색 결과가 없어요."}
              </p>
            )}

            <div className="mt-3 space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>
                <Plus /> 포장지 보고 직접 등록
              </Button>
              {mfds.enabled === false && q.trim().length >= 2 && (
                <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Database className="size-3" /> 식약처 DB 연결 전이라 기본 상품에서만 찾고 있어요
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FoodRow({ food, onClick, highlight }: { food: FoodProduct; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {food.brand && <span className="text-muted-foreground">{food.brand} </span>}
          {food.name}
        </div>
        <div className="num truncate text-[11px] text-muted-foreground">
          {food.servingSize}
          {food.servingUnit} · {fmt(food.kcal)}kcal · 탄 {round1(food.carbs)} · 지 {round1(food.fat)}
          {food.source === "mfds" && <span className="ml-1 opacity-70">· 식약처</span>}
          {food.source === "custom" && <span className="ml-1 opacity-70">· 직접 등록</span>}
        </div>
      </div>
      <Badge variant={highlight ? "default" : "secondary"} className="num shrink-0">
        단 {round1(food.protein)}g
      </Badge>
    </button>
  );
}

function AmountStep({
  food,
  defaultMeal,
  onBack,
  onSave,
}: {
  food: FoodProduct;
  defaultMeal: MealSlot;
  onBack: () => void;
  onSave: (meal: MealSlot, servings: number) => void;
}) {
  const [meal, setMeal] = React.useState<MealSlot>(defaultMeal);
  const [unit, setUnit] = React.useState<"serving" | "amount">("serving");
  const [value, setValue] = React.useState("1");
  const n = Number(value) || 0;
  const servings = unit === "serving" ? n : n / food.servingSize;
  const m = (x: number) => round1(x * servings);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> 다른 음식 고르기
      </button>
      <div>
        <div className="text-[15px] font-semibold">
          {food.brand && <span className="text-muted-foreground">{food.brand} </span>}
          {food.name}
        </div>
        <div className="num text-[12px] text-muted-foreground">
          1회 {food.servingSize}
          {food.servingUnit} 기준 단백질 {food.protein}g · {fmt(food.kcal)}kcal
        </div>
      </div>

      <div className="flex gap-1.5">
        {(Object.keys(MEAL_LABEL) as MealSlot[]).map((k) => (
          <Chip key={k} active={meal === k} onClick={() => setMeal(k)} className="flex-1 py-1.5 text-[13px]">
            {MEAL_LABEL[k]}
          </Chip>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-1.5">
          <Chip
            active={unit === "serving"}
            onClick={() => {
              setUnit("serving");
              setValue(String(round1(servings) || 1));
            }}
          >
            인분/개
          </Chip>
          <Chip
            active={unit === "amount"}
            onClick={() => {
              setUnit("amount");
              setValue(String(Math.round(servings * food.servingSize) || food.servingSize));
            }}
          >
            {food.servingUnit} 직접 입력
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="num h-11 flex-1 text-center text-lg"
          />
          <span className="w-12 text-sm text-muted-foreground">{unit === "serving" ? "인분" : food.servingUnit}</span>
        </div>
        {unit === "serving" && (
          <div className="flex gap-1.5">
            {[0.5, 1, 1.5, 2, 3].map((v) => (
              <Chip key={v} active={n === v} onClick={() => setValue(String(v))} className="flex-1">
                {v}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-muted/50 p-3 text-center">
        {(
          [
            ["단백질", m(food.protein), "g"],
            ["탄수", m(food.carbs), "g"],
            ["지방", m(food.fat), "g"],
            ["칼로리", Math.round(food.kcal * servings), ""],
          ] as const
        ).map(([l, v, u]) => (
          <div key={l}>
            <div className="text-[10px] text-muted-foreground">{l}</div>
            <div className={cn("num text-[15px] font-semibold", l === "단백질" && "text-[#a5acf0]")}>
              {v}
              <span className="text-[10px] font-normal text-muted-foreground">{u}</span>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" disabled={servings <= 0} onClick={() => onSave(meal, round1(servings * 100) / 100)}>
        {MEAL_LABEL[meal]}에 추가
      </Button>
    </div>
  );
}

function CustomFoodForm({
  initialName,
  onSave,
  onCancel,
}: {
  initialName: string;
  onSave: (f: FoodProduct) => void;
  onCancel: () => void;
}) {
  const [f, setF] = React.useState({
    name: initialName,
    brand: "",
    servingSize: "100",
    servingUnit: "g" as "g" | "ml",
    kcal: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">포장지 영양정보 표를 보고 1회 제공량 기준으로 입력해 주세요.</p>
      <Field label="상품명">
        <Input autoFocus value={f.name} onChange={set("name")} placeholder="예: 닭가슴살 스테이크 오리지널" />
      </Field>
      <Field label="브랜드 (선택)">
        <Input value={f.brand} onChange={set("brand")} placeholder="예: 아임닭" />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="1회 제공량">
          <Input type="number" inputMode="decimal" value={f.servingSize} onChange={set("servingSize")} className="num" />
        </Field>
        <div className="flex items-end gap-1 pb-0.5">
          {(["g", "ml"] as const).map((u) => (
            <Chip key={u} active={f.servingUnit === u} onClick={() => setF({ ...f, servingUnit: u })}>
              {u}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Field label="단백질 g">
          <Input type="number" inputMode="decimal" value={f.protein} onChange={set("protein")} className="num" />
        </Field>
        <Field label="탄수 g">
          <Input type="number" inputMode="decimal" value={f.carbs} onChange={set("carbs")} className="num" />
        </Field>
        <Field label="지방 g">
          <Input type="number" inputMode="decimal" value={f.fat} onChange={set("fat")} className="num" />
        </Field>
        <Field label="kcal">
          <Input
            type="number"
            inputMode="decimal"
            value={f.kcal}
            onChange={set("kcal")}
            placeholder={String(Math.round(Number(f.protein) * 4 + Number(f.carbs) * 4 + Number(f.fat) * 9) || "")}
            className="num"
          />
        </Field>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button
          className="flex-1"
          disabled={!f.name.trim() || !(Number(f.servingSize) > 0)}
          onClick={() => {
            const p = Number(f.protein) || 0;
            const c = Number(f.carbs) || 0;
            const fat = Number(f.fat) || 0;
            onSave({
              id: `custom-${uid()}`,
              name: f.name.trim(),
              brand: f.brand.trim() || undefined,
              category: "직접 등록",
              servingSize: Number(f.servingSize),
              servingUnit: f.servingUnit,
              protein: p,
              carbs: c,
              fat,
              kcal: Number(f.kcal) || Math.round(p * 4 + c * 4 + fat * 9),
              source: "custom",
            });
          }}
        >
          저장하고 추가
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
