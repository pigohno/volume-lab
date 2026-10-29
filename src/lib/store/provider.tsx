"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type { Exercise, FoodProduct, Goals, InbodyRecord, MealEntry, SharePayload, WorkoutEntry } from "@/lib/types";
import { DEFAULT_GOALS } from "@/lib/types";
import { EXERCISES } from "@/lib/data/exercises";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";
import { localRepo } from "./local-repo";
import { supabaseRepo } from "./supabase-repo";
import type { Repo, Snapshot } from "./repo";

interface Store extends Snapshot {
  ready: boolean;
  mode: Repo["mode"];
  session: Session | null;
  authChecked: boolean;
  getExercise: (id: string) => Exercise | undefined;
  allExercises: Exercise[];
  saveWorkout: (w: WorkoutEntry) => void;
  deleteWorkout: (id: string) => void;
  saveMeal: (m: MealEntry) => void;
  deleteMeal: (id: string) => void;
  saveInbody: (r: InbodyRecord) => void;
  deleteInbody: (id: string) => void;
  saveGoals: (g: Goals) => void;
  saveCustomFood: (f: FoodProduct) => void;
  saveCustomExercise: (e: Exercise) => void;
  createShare: (p: SharePayload) => Promise<string>;
  signOut: () => Promise<void>;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error("useStore는 DataProvider 안에서만 사용할 수 있습니다.");
  return s;
}

const EMPTY: Snapshot = {
  workouts: [],
  meals: [],
  inbody: [],
  goals: DEFAULT_GOALS,
  customFoods: [],
  customExercises: [],
};

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  return i >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const repo: Repo = supabaseEnabled ? supabaseRepo : localRepo;
  const [snap, setSnap] = React.useState<Snapshot>(EMPTY);
  const [ready, setReady] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [authChecked, setAuthChecked] = React.useState(!supabaseEnabled);

  // Supabase 모드: 세션을 확인하고 변경을 구독
  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  React.useEffect(() => {
    if (supabaseEnabled && !userId) {
      setSnap(EMPTY);
      setReady(false);
      return;
    }
    let alive = true;
    repo
      .loadAll()
      .then((s) => alive && setSnap(s))
      .catch((e: Error) => toast.error(`데이터를 불러오지 못했어요: ${e.message}`))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [repo, userId]);

  // 낙관적 업데이트: 화면 먼저 바꾸고, 저장 실패 시 알림 + 되돌림
  const run = React.useCallback(
    (apply: (s: Snapshot) => Snapshot, persist: () => Promise<void>) => {
      let prev: Snapshot | null = null;
      setSnap((s) => {
        prev = s;
        return apply(s);
      });
      persist().catch((e: Error) => {
        toast.error(`저장에 실패했어요: ${e.message}`);
        if (prev) setSnap(prev);
      });
    },
    [],
  );

  const allExercises = React.useMemo(() => [...EXERCISES, ...snap.customExercises], [snap.customExercises]);
  const exMap = React.useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);

  const value: Store = {
    ...snap,
    ready,
    mode: repo.mode,
    session,
    authChecked,
    allExercises,
    getExercise: (id) => exMap.get(id),
    saveWorkout: (w) => run((s) => ({ ...s, workouts: upsert(s.workouts, w) }), () => repo.saveWorkout(w)),
    deleteWorkout: (id) =>
      run((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== id) }), () => repo.deleteWorkout(id)),
    saveMeal: (m) => run((s) => ({ ...s, meals: upsert(s.meals, m) }), () => repo.saveMeal(m)),
    deleteMeal: (id) => run((s) => ({ ...s, meals: s.meals.filter((x) => x.id !== id) }), () => repo.deleteMeal(id)),
    saveInbody: (r) => run((s) => ({ ...s, inbody: upsert(s.inbody, r) }), () => repo.saveInbody(r)),
    deleteInbody: (id) =>
      run((s) => ({ ...s, inbody: s.inbody.filter((x) => x.id !== id) }), () => repo.deleteInbody(id)),
    saveGoals: (g) => run((s) => ({ ...s, goals: g }), () => repo.saveGoals(g)),
    saveCustomFood: (f) => run((s) => ({ ...s, customFoods: upsert(s.customFoods, f) }), () => repo.saveCustomFood(f)),
    saveCustomExercise: (e) =>
      run((s) => ({ ...s, customExercises: upsert(s.customExercises, e) }), () => repo.saveCustomExercise(e)),
    createShare: (p) => repo.createShare(p),
    signOut: async () => {
      if (supabaseEnabled) await getSupabase().auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
