"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type { Exercise, FoodProduct, Goals, InbodyRecord, MealEntry, SharePayload, WorkoutEntry } from "@/lib/types";
import { DEFAULT_GOALS } from "@/lib/types";
import { EXERCISES } from "@/lib/data/exercises";
import { CARDIO } from "@/lib/data/cardio";
import { getSupabase, isAuthError, supabaseEnabled } from "@/lib/supabase";
import { localRepo } from "./local-repo";
import { supabaseRepo } from "./supabase-repo";
import type { Repo, Snapshot } from "./repo";

interface Store extends Snapshot {
  ready: boolean;
  mode: Repo["mode"];
  session: Session | null;
  authChecked: boolean;
  /** 소유자가 아닌 계정으로 로그인한 경우 */
  denied: boolean;
  loadError: string | null;
  reload: () => void;
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

  const [denied, setDenied] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const loadErrorRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    loadErrorRef.current = loadError;
  }, [loadError]);
  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  // Supabase 모드: 세션을 확인하고 변경을 구독
  React.useEffect(() => {
    if (!supabaseEnabled) return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // 토큰이 갱신됐는데 직전 로딩이 실패한 상태라면 다시 불러오기
      if (event === "TOKEN_REFRESHED" && loadErrorRef.current) reload();
    });
    // 앱을 다시 열었을 때(백그라운드 → 화면) 실패 상태면 다시 불러오기
    const onVisible = () => {
      if (document.visibilityState === "visible" && loadErrorRef.current) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  const userId = session?.user.id;

  React.useEffect(() => {
    if (supabaseEnabled && !userId) {
      setSnap(EMPTY);
      setReady(false);
      setDenied(false);
      return;
    }
    let alive = true;

    async function load(retry: boolean): Promise<void> {
      try {
        if (!(await repo.checkOwner())) {
          if (alive) setDenied(true);
          return;
        }
        const s = await repo.loadAll();
        if (!alive) return;
        setSnap(s);
        setDenied(false);
        setLoadError(null);
      } catch (e) {
        // 토큰이 만료된 채로 요청이 나간 경우: 세션을 갱신하고 한 번 더 시도
        if (retry && supabaseEnabled && isAuthError(e)) {
          const { error } = await getSupabase().auth.refreshSession();
          if (!error) return load(false);
        }
        if (alive) setLoadError((e as Error).message);
      }
    }

    load(true).finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [repo, userId, reloadKey]);

  // 낙관적 업데이트: 화면 먼저 바꾸고, 저장 실패 시 알림 + 되돌림
  const run = React.useCallback(
    (apply: (s: Snapshot) => Snapshot, persist: () => Promise<void>) => {
      let prev: Snapshot | null = null;
      setSnap((s) => {
        prev = s;
        return apply(s);
      });
      persist()
        .catch(async (e: Error) => {
          // 토큰 만료로 실패했으면 세션 갱신 후 한 번 더 저장
          if (supabaseEnabled && isAuthError(e) && !(await getSupabase().auth.refreshSession()).error) return persist();
          throw e;
        })
        .catch((e: Error) => {
          toast.error(`저장에 실패했어요: ${e.message}`);
          if (prev) setSnap(prev);
        });
    },
    [],
  );

  const allExercises = React.useMemo(() => [...EXERCISES, ...CARDIO, ...snap.customExercises], [snap.customExercises]);
  const exMap = React.useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);

  const value: Store = {
    ...snap,
    ready,
    mode: repo.mode,
    session,
    authChecked,
    denied,
    loadError,
    reload,
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
      setDenied(false);
      setLoadError(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
