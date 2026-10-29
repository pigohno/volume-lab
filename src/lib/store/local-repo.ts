import { DEFAULT_GOALS } from "@/lib/types";
import type { Repo, Snapshot } from "./repo";
import { encodeShare } from "./share-codec";

const KEY = "volume-lab:v1";

function read(): Snapshot {
  const empty: Snapshot = {
    workouts: [],
    meals: [],
    inbody: [],
    goals: DEFAULT_GOALS,
    customFoods: [],
    customExercises: [],
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return { ...empty, ...parsed, goals: { ...DEFAULT_GOALS, ...parsed.goals } };
  } catch {
    return empty;
  }
}

function write(s: Snapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 저장 공간이 막힌 환경(시크릿 창 등)에서는 메모리에만 유지
  }
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  return i >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function mutate(fn: (s: Snapshot) => Snapshot) {
  write(fn(read()));
  return Promise.resolve();
}

export const localRepo: Repo = {
  mode: "local",
  loadAll: () => Promise.resolve(read()),
  saveWorkout: (w) => mutate((s) => ({ ...s, workouts: upsert(s.workouts, w) })),
  deleteWorkout: (id) => mutate((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== id) })),
  saveMeal: (m) => mutate((s) => ({ ...s, meals: upsert(s.meals, m) })),
  deleteMeal: (id) => mutate((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) })),
  saveInbody: (r) => mutate((s) => ({ ...s, inbody: upsert(s.inbody, r) })),
  deleteInbody: (id) => mutate((s) => ({ ...s, inbody: s.inbody.filter((x) => x.id !== id) })),
  saveGoals: (g) => mutate((s) => ({ ...s, goals: g })),
  saveCustomFood: (f) => mutate((s) => ({ ...s, customFoods: upsert(s.customFoods, f) })),
  saveCustomExercise: (e) => mutate((s) => ({ ...s, customExercises: upsert(s.customExercises, e) })),
  createShare: (p) => Promise.resolve(encodeShare(p)),
};
