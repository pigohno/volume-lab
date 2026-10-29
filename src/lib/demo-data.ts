import type { Exercise, FoodProduct, InbodyRecord, MealEntry, MealSlot, WorkoutEntry } from "./types";
import { EXERCISES } from "./data/exercises";
import { SEED_FOODS } from "./data/foods";
import { shiftDays, today } from "./dates";
import { normalize } from "./search";
import { uid } from "./utils";

// 데모 모드에서 화면을 바로 둘러볼 수 있게, 최근 2주치 샘플 기록을 만들어 줍니다.

function findEx(...names: string[]): Exercise | undefined {
  for (const n of names) {
    const q = normalize(n);
    const hit = EXERCISES.find((e) => normalize(e.name) === q) ?? EXERCISES.find((e) => normalize(e.name).includes(q));
    if (hit) return hit;
  }
  return undefined;
}

function findFood(...names: string[]): FoodProduct | undefined {
  for (const n of names) {
    const q = normalize(n);
    const hit = SEED_FOODS.find((f) => normalize(`${f.brand ?? ""}${f.name}`).includes(q));
    if (hit) return hit;
  }
  return undefined;
}

type Plan = { ex: (Exercise | undefined)[]; base: number[] };

export function buildDemoData() {
  const t = today();
  const routines: Plan[] = [
    // 가슴·삼두
    {
      ex: [findEx("바벨 벤치프레스", "벤치프레스"), findEx("인클라인 덤벨 프레스"), findEx("케이블 크로스오버", "펙덱"), findEx("트라이셉스 푸시다운", "푸시다운")],
      base: [70, 26, 15, 25],
    },
    // 등·이두
    {
      ex: [findEx("랫풀다운"), findEx("바벨 로우"), findEx("시티드 케이블 로우"), findEx("바벨 컬", "덤벨 컬")],
      base: [55, 60, 50, 25],
    },
    // 하체
    {
      ex: [findEx("바벨 백스쿼트", "스쿼트"), findEx("레그프레스"), findEx("루마니안 데드리프트"), findEx("레그 컬", "라잉 레그컬")],
      base: [90, 160, 70, 35],
    },
    // 어깨
    {
      ex: [findEx("오버헤드 프레스", "밀리터리 프레스"), findEx("덤벨 사이드 레터럴 레이즈", "사이드 레터럴"), findEx("리어 델트", "페이스풀")],
      base: [42.5, 8, 20],
    },
  ];

  const workouts: WorkoutEntry[] = [];
  const schedule = [-13, -12, -10, -9, -7, -6, -5, -3, -2, 0];
  schedule.forEach((offset, i) => {
    const r = routines[i % routines.length];
    const week = offset > -7 ? 1 : 0; // 이번 주는 살짝 증량
    const date = shiftDays(t, offset);
    r.ex.forEach((ex, j) => {
      if (!ex) return;
      const w = r.base[j] + week * (r.base[j] >= 40 ? 2.5 : 1);
      workouts.push({
        id: uid(),
        date,
        exerciseId: ex.id,
        sets: [
          { weight: w, reps: 10 },
          { weight: w, reps: 9 + week },
          { weight: w, reps: 8 },
        ],
        stimulated: j === 0 ? ex.primary.slice(0, 1) : [],
        createdAt: new Date(Date.parse(date) + j * 60000).toISOString(),
      });
    });
  });

  const menu: [MealSlot, (FoodProduct | undefined)[], number][] = [
    ["breakfast", [findFood("그릭요거트"), findFood("바나나")], 1],
    ["lunch", [findFood("햇반", "현미밥"), findFood("닭가슴살")], 1],
    ["snack", [findFood("셀렉스", "프로틴")], 1],
    ["dinner", [findFood("고구마"), findFood("소고기", "돼지 안심", "연어")], 1],
  ];
  const meals: MealEntry[] = [];
  for (const offset of [-2, -1, 0]) {
    const date = shiftDays(t, offset);
    menu.forEach(([meal, foods, servings], i) =>
      foods.forEach((f, j) => {
        if (!f || (offset === 0 && meal === "dinner")) return;
        meals.push({
          id: uid(),
          date,
          meal,
          food: f,
          servings,
          createdAt: new Date(Date.parse(date) + (i * 10 + j) * 60000).toISOString(),
        });
      }),
    );
  }

  const inbody: InbodyRecord[] = [
    { d: -42, w: 78.4, m: 35.1, f: 15.9 },
    { d: -28, w: 77.9, m: 35.4, f: 15.1 },
    { d: -14, w: 77.6, m: 35.8, f: 14.6 },
    { d: -1, w: 77.8, m: 36.2, f: 14.2 },
  ].map((r) => ({
    id: uid(),
    date: shiftDays(t, r.d),
    weight: r.w,
    skeletalMuscle: r.m,
    bodyFatMass: r.f,
    bodyFatPct: Math.round((r.f / r.w) * 1000) / 10,
    createdAt: new Date().toISOString(),
  }));

  return { workouts, meals, inbody };
}
