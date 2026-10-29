import type { MacroTotals, Verdict } from "./calc";
import type { MuscleId } from "./types";

// 공유 링크에 담기는 데이터 모양 — 공유 페이지(/s/[id])는 이것만 보고 그립니다.

export interface VolumeShareData {
  weekStart: string;
  totalVolume: number;
  totalSets: number;
  days: { date: string; volume: number }[];
  intensity: Partial<Record<MuscleId, number>>;
  stimulated: MuscleId[];
  topMuscles: { id: MuscleId; sets: number }[];
  vsLastWeek: number | null; // %
}

export interface DietShareData {
  date: string;
  totals: MacroTotals;
  targets: MacroTotals;
  verdicts: Record<"protein" | "carbs" | "fat" | "kcal", Verdict>;
  meals?: { meal: string; name: string; protein: number }[];
}

export interface InbodyShareData {
  weightOnly: boolean;
  records: { date: string; weight: number; skeletalMuscle?: number; bodyFatPct?: number }[];
}
