import { DEFAULT_GOALS } from "@/lib/types";
import type { Exercise, FoodProduct, InbodyRecord, MealEntry, WorkoutEntry } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import type { Repo } from "./repo";

// DB 컬럼(snake_case) ↔ 앱 타입(camelCase) 매핑
type Row = Record<string, unknown>;

const toWorkout = (r: Row): WorkoutEntry => ({
  id: r.id as string,
  date: r.date as string,
  exerciseId: r.exercise_id as string,
  sets: (r.sets as WorkoutEntry["sets"]) ?? [],
  stimulated: (r.stimulated as WorkoutEntry["stimulated"]) ?? [],
  note: (r.note as string) ?? undefined,
  createdAt: r.created_at as string,
});

const toMeal = (r: Row): MealEntry => ({
  id: r.id as string,
  date: r.date as string,
  meal: r.meal as MealEntry["meal"],
  food: r.food as FoodProduct,
  servings: Number(r.servings),
  createdAt: r.created_at as string,
});

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

const toInbody = (r: Row): InbodyRecord => ({
  id: r.id as string,
  date: r.date as string,
  weight: Number(r.weight),
  skeletalMuscle: num(r.skeletal_muscle),
  bodyFatMass: num(r.body_fat_mass),
  bodyFatPct: num(r.body_fat_pct),
  note: (r.note as string) ?? undefined,
  createdAt: r.created_at as string,
});

async function check<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const res = await p;
  if (res.error) throw new Error(res.error.message);
  return res;
}

function shortId() {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => abc[b % abc.length]).join("");
}

export const supabaseRepo: Repo = {
  mode: "supabase",

  async loadAll() {
    const sb = getSupabase();
    const [w, m, i, g, f, e] = await Promise.all([
      check(sb.from("vl_workouts").select("*").order("date", { ascending: false }).limit(5000)),
      check(sb.from("vl_meals").select("*").order("date", { ascending: false }).limit(5000)),
      check(sb.from("vl_inbody").select("*").order("date", { ascending: false }).limit(1000)),
      check(sb.from("vl_goals").select("goals").maybeSingle()),
      check(sb.from("vl_custom_foods").select("data")),
      check(sb.from("vl_custom_exercises").select("data")),
    ]);
    return {
      workouts: (w.data ?? []).map(toWorkout),
      meals: (m.data ?? []).map(toMeal),
      inbody: (i.data ?? []).map(toInbody),
      goals: { ...DEFAULT_GOALS, ...((g.data as Row | null)?.goals as object) },
      customFoods: (f.data ?? []).map((r: Row) => r.data as FoodProduct),
      customExercises: (e.data ?? []).map((r: Row) => r.data as Exercise),
    };
  },

  async saveWorkout(x) {
    await check(
      getSupabase().from("vl_workouts").upsert({
        id: x.id,
        date: x.date,
        exercise_id: x.exerciseId,
        sets: x.sets,
        stimulated: x.stimulated ?? [],
        note: x.note ?? null,
        created_at: x.createdAt,
      }),
    );
  },
  async deleteWorkout(id) {
    await check(getSupabase().from("vl_workouts").delete().eq("id", id));
  },

  async saveMeal(x) {
    await check(
      getSupabase().from("vl_meals").upsert({
        id: x.id,
        date: x.date,
        meal: x.meal,
        food: x.food,
        servings: x.servings,
        created_at: x.createdAt,
      }),
    );
  },
  async deleteMeal(id) {
    await check(getSupabase().from("vl_meals").delete().eq("id", id));
  },

  async saveInbody(x) {
    await check(
      getSupabase().from("vl_inbody").upsert({
        id: x.id,
        date: x.date,
        weight: x.weight,
        skeletal_muscle: x.skeletalMuscle ?? null,
        body_fat_mass: x.bodyFatMass ?? null,
        body_fat_pct: x.bodyFatPct ?? null,
        note: x.note ?? null,
        created_at: x.createdAt,
      }),
    );
  },
  async deleteInbody(id) {
    await check(getSupabase().from("vl_inbody").delete().eq("id", id));
  },

  async saveGoals(goals) {
    const sb = getSupabase();
    const { data } = await sb.auth.getUser();
    await check(sb.from("vl_goals").upsert({ user_id: data.user!.id, goals, updated_at: new Date().toISOString() }));
  },

  async saveCustomFood(f) {
    await check(getSupabase().from("vl_custom_foods").upsert({ id: f.id, data: f }));
  },
  async saveCustomExercise(e) {
    await check(getSupabase().from("vl_custom_exercises").upsert({ id: e.id, data: e }));
  },

  async createShare(p) {
    const id = shortId();
    await check(getSupabase().from("vl_shares").insert({ id, kind: p.kind, payload: p }));
    return id;
  },
};
