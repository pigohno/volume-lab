import type { Exercise, Goals, InbodyRecord, MealEntry, MuscleId, SetRecord, WorkoutEntry } from "./types";
import { MUSCLES } from "./muscles";
import { round1 } from "./utils";
import { weekDays } from "./dates";

// ───────── 운동 볼륨 ─────────

export function effectiveWeight(ex: Exercise | undefined, set: SetRecord, bodyWeight: number) {
  // 맨몸 운동은 체중을 기준 무게로 잡고, 입력한 무게는 추가 중량으로 봅니다.
  return ex?.equipment === "bodyweight" ? bodyWeight + set.weight : set.weight;
}

export const isCardio = (ex: Exercise | undefined) => ex?.met !== undefined;

export const cardioMinutes = (entry: WorkoutEntry) => entry.sets.reduce((s, x) => s + (x.minutes ?? 0), 0);
export const cardioKm = (entry: WorkoutEntry) => entry.sets.reduce((s, x) => s + (x.km ?? 0), 0);

/** 유산소 소모 칼로리 추정 = MET × 체중 × 시간 */
export function cardioKcal(entry: WorkoutEntry, ex: Exercise | undefined, bodyWeight: number) {
  if (!ex?.met) return 0;
  return Math.round((ex.met * bodyWeight * cardioMinutes(entry)) / 60);
}

export function entryVolume(entry: WorkoutEntry, ex: Exercise | undefined, bodyWeight: number) {
  if (isCardio(ex)) return 0; // 유산소는 kg 볼륨에서 제외
  return entry.sets.reduce((s, set) => s + effectiveWeight(ex, set, bodyWeight) * set.reps, 0);
}

export function bestSet(sets: SetRecord[]) {
  return sets.reduce<SetRecord | null>((b, s) => {
    if (!b) return s;
    return e1rm(s) > e1rm(b) ? s : b;
  }, null);
}

/** Epley 추정 1RM */
export const e1rm = (s: SetRecord) => (s.reps <= 1 ? s.weight : s.weight * (1 + s.reps / 30));

export interface WeekSummary {
  days: { date: string; volume: number; sets: number }[];
  totalVolume: number;
  totalSets: number;
  muscleSets: Record<MuscleId, number>;
  muscleVolume: Record<MuscleId, number>;
  stimulated: Partial<Record<MuscleId, number>>; // 직접 체크한 횟수
  exerciseCount: number;
  cardioMinutes: number;
  cardioKcal: number;
  cardioDays: number;
}

const emptyMuscleRecord = () =>
  Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<MuscleId, number>;

export function summarizeWeek(
  startKey: string,
  workouts: WorkoutEntry[],
  getEx: (id: string) => Exercise | undefined,
  bodyWeight: number,
): WeekSummary {
  const keys = weekDays(startKey);
  const inWeek = workouts.filter((w) => keys.includes(w.date));
  const muscleSets = emptyMuscleRecord();
  const muscleVolume = emptyMuscleRecord();
  const stimulated: Partial<Record<MuscleId, number>> = {};
  const days = keys.map((date) => ({ date, volume: 0, sets: 0 }));

  let cMin = 0;
  let cKcal = 0;
  const cDays = new Set<string>();
  for (const w of inWeek) {
    const ex = getEx(w.exerciseId);
    if (isCardio(ex)) {
      cMin += cardioMinutes(w);
      cKcal += cardioKcal(w, ex, bodyWeight);
      if (cardioMinutes(w) > 0) cDays.add(w.date);
      continue;
    }
    const vol = entryVolume(w, ex, bodyWeight);
    const d = days.find((x) => x.date === w.date)!;
    d.volume += vol;
    d.sets += w.sets.length;
    if (ex) {
      // 주동근 1세트, 협응근 0.5세트로 계산 (일반적인 주간 세트 카운팅 방식)
      for (const m of ex.primary) {
        muscleSets[m] += w.sets.length;
        muscleVolume[m] += vol;
      }
      for (const m of ex.secondary) {
        muscleSets[m] += w.sets.length * 0.5;
        muscleVolume[m] += vol * 0.5;
      }
    }
    for (const m of w.stimulated ?? []) stimulated[m] = (stimulated[m] ?? 0) + 1;
  }

  return {
    days,
    totalVolume: days.reduce((s, d) => s + d.volume, 0),
    totalSets: days.reduce((s, d) => s + d.sets, 0),
    muscleSets,
    muscleVolume,
    stimulated,
    exerciseCount: new Set(inWeek.filter((w) => !isCardio(getEx(w.exerciseId))).map((w) => w.exerciseId)).size,
    cardioMinutes: cMin,
    cardioKcal: cKcal,
    cardioDays: cDays.size,
  };
}

/** 부위맵에 칠할 0..1 강도. 직접 체크한 자극 부위는 최소 0.6 이상으로 끌어올립니다. */
export function muscleIntensity(sum: WeekSummary, weeklySetTarget: number) {
  const out: Partial<Record<MuscleId, number>> = {};
  for (const m of MUSCLES) {
    const bySets = Math.min(1, sum.muscleSets[m.id] / Math.max(1, weeklySetTarget));
    const byStim = sum.stimulated[m.id] ? 0.6 + Math.min(0.4, sum.stimulated[m.id]! * 0.15) : 0;
    const v = Math.max(bySets, byStim);
    if (v > 0) out[m.id] = round1(v * 100) / 100;
  }
  return out;
}

/** 점진적 과부하 제안 — 지난 기록을 보고 오늘 목표를 한 줄로 제시 */
export function overloadHint(last: WorkoutEntry | undefined, ex?: Exercise): string | null {
  if (!last || last.sets.length === 0) return null;
  if (isCardio(ex)) {
    const m = cardioMinutes(last);
    const km = round1(cardioKm(last));
    if (!m) return null;
    return km > 0 ? `지난번 ${m}분 · ${km}km → 오늘은 같은 시간에 ${round1(km + 0.2)}km 도전` : `지난번 ${m}분 → 오늘은 ${m + 5}분 도전`;
  }
  const top = bestSet(last.sets)!;
  const allHigh = last.sets.every((s) => s.reps >= 12);
  if (top.weight === 0) return `지난번 최고 ${top.reps}회 → 오늘은 ${top.reps + 1}회 도전`;
  if (allHigh) return `전 세트 12회 이상 → 오늘은 ${round1(top.weight + 2.5)}kg으로 올려보세요`;
  return `지난번 ${top.weight}kg × ${top.reps} → 오늘은 ${top.weight}kg × ${top.reps + 1} 도전`;
}

// ───────── 식단 ─────────

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function mealTotals(meals: MealEntry[]): MacroTotals {
  return meals.reduce(
    (t, m) => ({
      kcal: t.kcal + m.food.kcal * m.servings,
      protein: t.protein + m.food.protein * m.servings,
      carbs: t.carbs + m.food.carbs * m.servings,
      fat: t.fat + m.food.fat * m.servings,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function currentWeight(goals: Goals, inbody: InbodyRecord[]) {
  const latest = [...inbody].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest?.weight ?? goals.bodyWeight;
}

export function macroTargets(goals: Goals, weight: number): MacroTotals {
  const protein = round1(weight * goals.proteinPerKg);
  const carbs = goals.carbsFixed ?? round1(weight * goals.carbsPerKg);
  const fat = goals.fatFixed ?? round1(weight * goals.fatPerKg);
  const kcal = goals.kcalFixed ?? Math.round(protein * 4 + carbs * 4 + fat * 9);
  return { protein, carbs, fat, kcal };
}

export type Verdict = "under" | "ok" | "over";

export function judge(actual: number, target: number, kind: keyof MacroTotals): Verdict {
  if (target <= 0) return "ok";
  const r = actual / target;
  if (r < 0.9) return "under";
  // 단백질은 넘쳐도 '충족'으로 봅니다. 나머지는 115% 넘으면 '초과'.
  if (kind !== "protein" && r > 1.15) return "over";
  return "ok";
}

export const VERDICT_LABEL: Record<Verdict, string> = { under: "부족", ok: "충족", over: "초과" };
