import type { Exercise, FoodProduct, Goals, InbodyRecord, MealEntry, SharePayload, WorkoutEntry } from "@/lib/types";

export interface Snapshot {
  workouts: WorkoutEntry[];
  meals: MealEntry[];
  inbody: InbodyRecord[];
  goals: Goals;
  customFoods: FoodProduct[];
  customExercises: Exercise[];
}

/** 저장소 추상화 — 로컬(데모)과 Supabase가 같은 인터페이스를 구현합니다. */
export interface Repo {
  mode: "local" | "supabase";
  loadAll(): Promise<Snapshot>;
  saveWorkout(w: WorkoutEntry): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  saveMeal(m: MealEntry): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  saveInbody(r: InbodyRecord): Promise<void>;
  deleteInbody(id: string): Promise<void>;
  saveGoals(g: Goals): Promise<void>;
  saveCustomFood(f: FoodProduct): Promise<void>;
  saveCustomExercise(e: Exercise): Promise<void>;
  createShare(p: SharePayload): Promise<string>;
}
