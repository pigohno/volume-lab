// 도메인 타입 정의 — 화면, 저장소, 공유가 모두 이 타입을 기준으로 움직입니다.

export type MuscleId =
  | "chest"
  | "lats"
  | "upper_back"
  | "lower_back"
  | "front_delt"
  | "side_delt"
  | "rear_delt"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "calves";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "smith"
  | "kettlebell"
  | "band";

export interface Exercise {
  id: string;
  name: string; // 한국어 대표명
  nameEn: string;
  aliases: string[]; // 줄임말, 헬스장 은어, 영어 표기 등
  equipment: Equipment;
  primary: MuscleId[];
  secondary: MuscleId[];
  custom?: boolean;
}

export interface SetRecord {
  weight: number; // kg (맨몸은 0)
  reps: number;
}

export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  exerciseId: string;
  sets: SetRecord[];
  stimulated?: MuscleId[]; // 대표님이 직접 체크한 "자극 온 부위"
  note?: string;
  createdAt: string;
}

export interface FoodProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
  servingSize: number; // 1회 제공량
  servingUnit: "g" | "ml";
  // 아래 수치는 모두 1회 제공량 기준
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "seed" | "mfds" | "custom";
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEntry {
  id: string;
  date: string;
  meal: MealSlot;
  food: FoodProduct; // 기록 시점 스냅샷
  servings: number; // 1회 제공량 대비 배수 (0.5, 1, 2 ...)
  createdAt: string;
}

export interface InbodyRecord {
  id: string;
  date: string;
  weight: number;
  skeletalMuscle?: number;
  bodyFatMass?: number;
  bodyFatPct?: number;
  note?: string;
  createdAt: string;
}

export interface Goals {
  bodyWeight: number; // 인바디 기록이 없을 때 쓰는 기준 체중
  proteinPerKg: number;
  carbsPerKg: number;
  fatPerKg: number;
  weeklySetTarget: number; // 부위별 주간 목표 세트 수
}

export const DEFAULT_GOALS: Goals = {
  bodyWeight: 75,
  proteinPerKg: 2.0,
  carbsPerKg: 3.5,
  fatPerKg: 0.8,
  weeklySetTarget: 12,
};

export type ShareKind = "volume" | "diet" | "inbody";

export interface SharePayload {
  kind: ShareKind;
  title: string;
  createdAt: string;
  data: unknown;
}
