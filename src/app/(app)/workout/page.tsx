"use client";

import * as React from "react";
import { Copy, Dumbbell, History, Plus, Search, Trash2, X, Zap } from "lucide-react";
import type { Exercise, MuscleId, SetRecord, WorkoutEntry } from "@/lib/types";
import { useStore } from "@/lib/store/provider";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { bestSet, e1rm, entryVolume, overloadHint } from "@/lib/calc";
import { labelDay, today } from "@/lib/dates";
import { cn, fmt, round1, uid } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { DateNav } from "@/components/date-nav";
import { Chip, ExercisePicker, useExerciseSearch } from "@/components/exercise-picker";
import { Empty, Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WorkoutPage() {
  return (
    <>
      <PageHeader title="운동" description="기록하고, 지난 기록보다 한 칸 더 올려보세요" />
      <Tabs defaultValue="log">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="log">
            <Dumbbell className="mr-1 size-3.5" /> 오늘 기록
          </TabsTrigger>
          <TabsTrigger value="find">
            <History className="mr-1 size-3.5" /> 기록 찾기
          </TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <LogTab />
        </TabsContent>
        <TabsContent value="find">
          <FindTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ─────────────────────────── 오늘 기록 ───────────────────────────

function LogTab() {
  const { workouts, saveWorkout, getExercise, goals, ready } = useStore();
  const [date, setDate] = React.useState(today);
  const [picker, setPicker] = React.useState(false);

  const entries = workouts
    .filter((w) => w.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const lastOf = React.useCallback(
    (exerciseId: string, before: string) =>
      workouts
        .filter((w) => w.exerciseId === exerciseId && w.date < before && w.sets.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [workouts],
  );

  const addExercise = (ex: Exercise) => {
    const last = lastOf(ex.id, date);
    // 지난 기록의 세트를 그대로 복사해 두면, 숫자만 살짝 고치면 끝나요
    const sets: SetRecord[] = last ? last.sets.map((s) => ({ ...s })) : [{ weight: 0, reps: 10 }];
    saveWorkout({ id: uid(), date, exerciseId: ex.id, sets, stimulated: [], createdAt: new Date().toISOString() });
  };

  const prevDay = React.useMemo(() => {
    const dates = [...new Set(workouts.filter((w) => w.date < date).map((w) => w.date))].sort();
    return dates.at(-1);
  }, [workouts, date]);

  const copyDay = (from: string) => {
    const base = Date.now();
    workouts
      .filter((w) => w.date === from)
      .forEach((w, i) =>
        saveWorkout({
          ...w,
          id: uid(),
          date,
          stimulated: [],
          note: undefined,
          createdAt: new Date(base + i).toISOString(),
        }),
      );
  };

  const dayVolume = entries.reduce((s, w) => s + entryVolume(w, getExercise(w.exerciseId), goals.bodyWeight), 0);
  const daySets = entries.reduce((s, w) => s + w.sets.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateNav value={date} onChange={setDate} />
        <Button onClick={() => setPicker(true)}>
          <Plus /> 운동 추가
        </Button>
      </div>

      {entries.length > 0 && (
        <Card className="grid grid-cols-3 gap-3 p-4">
          <Stat label="총 볼륨" value={fmt(dayVolume)} unit="kg" />
          <Stat label="세트" value={daySets} unit="세트" />
          <Stat label="운동" value={entries.length} unit="종목" />
        </Card>
      )}

      {ready && entries.length === 0 && (
        <Empty icon={<Dumbbell className="size-6" />} title="아직 기록이 없어요">
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => setPicker(true)}>
              <Search /> 운동 찾기
            </Button>
            {prevDay && (
              <Button size="sm" variant="secondary" onClick={() => copyDay(prevDay)}>
                <Copy /> {labelDay(prevDay)} 루틴 불러오기
              </Button>
            )}
          </div>
        </Empty>
      )}

      {entries.map((w) => (
        <EntryCard key={w.id} entry={w} last={lastOf(w.exerciseId, w.date)} />
      ))}

      <ExercisePicker open={picker} onOpenChange={setPicker} onPick={addExercise} />
    </div>
  );
}

function EntryCard({ entry, last }: { entry: WorkoutEntry; last?: WorkoutEntry }) {
  const { getExercise, saveWorkout, deleteWorkout, goals } = useStore();
  const ex = getExercise(entry.exerciseId);
  const [draft, setDraft] = React.useState(entry);
  const dirty = React.useRef(false);

  // 입력할 때마다 저장하지 않고 0.5초 쉬면 저장 (Supabase 호출 줄이기)
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      saveWorkout(draft);
      dirty.current = false;
    }, 500);
    return () => clearTimeout(t);
  }, [draft, saveWorkout]);

  const update = (fn: (d: WorkoutEntry) => WorkoutEntry) => {
    dirty.current = true;
    setDraft(fn);
  };

  const setField = (i: number, k: keyof SetRecord, v: string) =>
    update((d) => ({
      ...d,
      sets: d.sets.map((s, j) => (j === i ? { ...s, [k]: v === "" ? 0 : Math.max(0, Number(v)) } : s)),
    }));

  const addSet = () =>
    update((d) => ({ ...d, sets: [...d.sets, { ...(d.sets.at(-1) ?? { weight: 0, reps: 10 }) }] }));
  const removeSet = (i: number) => update((d) => ({ ...d, sets: d.sets.filter((_, j) => j !== i) }));
  const toggleStim = (m: MuscleId) =>
    update((d) => {
      const s = d.stimulated ?? [];
      return { ...d, stimulated: s.includes(m) ? s.filter((x) => x !== m) : [...s, m] };
    });

  const volume = entryVolume(draft, ex, goals.bodyWeight);
  const lastVolume = last ? entryVolume(last, ex, goals.bodyWeight) : 0;
  const diff = lastVolume ? ((volume - lastVolume) / lastVolume) * 100 : null;
  const hint = overloadHint(last);
  const isBw = ex?.equipment === "bodyweight";
  const muscles = ex ? [...ex.primary, ...ex.secondary] : [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-tight">{ex?.name ?? "알 수 없는 운동"}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span className="num">{fmt(volume)} kg</span>
            {diff !== null && (
              <span className={cn("num", diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "")}>
                지난번 대비 {diff > 0 ? "+" : ""}
                {round1(diff)}%
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="운동 삭제"
          onClick={() => deleteWorkout(entry.id)}
          className="-mr-1.5"
        >
          <Trash2 />
        </Button>
      </div>

      {hint && (
        <div className="mx-4 mt-2.5 flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-[12px] text-[#b4baf5]">
          <Zap className="size-3.5 shrink-0" />
          {hint}
        </div>
      )}

      <div className="px-4 pt-3">
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 pb-1.5 text-[11px] text-muted-foreground">
          <span>세트</span>
          <span>{isBw ? "추가 중량 (kg)" : "무게 (kg)"}</span>
          <span>횟수</span>
          <span />
        </div>
        {draft.sets.map((s, i) => {
          const prev = last?.sets[i];
          return (
            <div key={i} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 py-1">
              <span className="num text-center text-xs text-muted-foreground">{i + 1}</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={s.weight || ""}
                placeholder={prev ? String(prev.weight) : "0"}
                onChange={(e) => setField(i, "weight", e.target.value)}
                className="num h-9 text-center"
              />
              <Input
                type="number"
                inputMode="numeric"
                value={s.reps || ""}
                placeholder={prev ? String(prev.reps) : "0"}
                onChange={(e) => setField(i, "reps", e.target.value)}
                className="num h-9 text-center"
              />
              <Button variant="ghost" size="icon-sm" aria-label="세트 삭제" onClick={() => removeSet(i)}>
                <X />
              </Button>
            </div>
          );
        })}
        <Button variant="ghost" size="sm" className="mt-1 w-full border border-dashed border-border" onClick={addSet}>
          <Plus /> 세트 추가
        </Button>
      </div>

      {muscles.length > 0 && (
        <div className="mt-3 border-t border-border px-4 py-3">
          <div className="mb-2 text-[11px] text-muted-foreground">자극 온 부위를 눌러 체크해 두세요</div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(muscles)].map((m) => (
              <Chip key={m} active={draft.stimulated?.includes(m)} onClick={() => toggleStim(m)}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────── 기록 찾기 ───────────────────────────

function FindTab() {
  const { workouts, getExercise, goals } = useStore();
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const matches = useExerciseSearch(q);

  const doneIds = React.useMemo(() => new Set(workouts.map((w) => w.exerciseId)), [workouts]);
  const list = matches.filter((e) => doneIds.has(e.id));

  const history = selected
    ? workouts.filter((w) => w.exerciseId === selected).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const ex = selected ? getExercise(selected) : undefined;
  const best = history.reduce((b, w) => Math.max(b, ...w.sets.map(e1rm)), 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSelected(null);
          }}
          placeholder="내가 했던 운동 검색 (예: 벤프, 스쿼트)"
          className="h-10 pl-9"
        />
      </div>

      {!selected && (
        <Card className="divide-y divide-border">
          {list.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {doneIds.size === 0 ? "아직 기록한 운동이 없어요." : "일치하는 기록이 없어요."}
            </p>
          )}
          {list.map((e) => {
            const ws = workouts.filter((w) => w.exerciseId === e.id);
            const lastDate = ws.map((w) => w.date).sort().at(-1)!;
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ws.length}회 · 마지막 {labelDay(lastDate)}
                  </div>
                </div>
                <History className="size-4 text-muted-foreground" />
              </button>
            );
          })}
        </Card>
      )}

      {selected && ex && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">{ex.name}</div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              목록으로
            </Button>
          </div>
          <Card className="grid grid-cols-3 gap-3 p-4">
            <Stat label="수행 횟수" value={history.length} unit="회" />
            <Stat label="추정 1RM 최고" value={round1(best)} unit="kg" />
            <Stat label="처음 기록" value={history.at(-1) ? labelDay(history.at(-1)!.date).split(" (")[0] : "-"} />
          </Card>
          <E1rmSpark history={[...history].reverse()} />
          <Card className="divide-y divide-border">
            {history.map((w) => {
              const top = bestSet(w.sets);
              return (
                <div key={w.id} className="px-4 py-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium">{labelDay(w.date)}</span>
                    <span className="num text-muted-foreground">
                      {fmt(entryVolume(w, ex, goals.bodyWeight))} kg
                    </span>
                  </div>
                  <div className="num mt-1 text-[12px] text-muted-foreground">
                    {w.sets.map((s) => `${s.weight}×${s.reps}`).join("  ·  ")}
                    {top && <span className="ml-2 text-foreground/70">(1RM≈{round1(e1rm(top))})</span>}
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

/** 추정 1RM 추이를 작은 라인으로 */
function E1rmSpark({ history }: { history: WorkoutEntry[] }) {
  const pts = history.map((w) => Math.max(0, ...w.sets.map(e1rm)));
  if (pts.length < 2) return null;
  const w = 320;
  const h = 64;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (w - 8) + 4, h - 6 - ((v - min) / span) * (h - 14)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <Card className="px-4 pb-3 pt-3">
      <div className="mb-1 text-[11px] text-muted-foreground">추정 1RM 추이</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
        <path d={`${d} L${w - 4},${h} L4,${h} Z`} fill="var(--primary)" opacity="0.12" />
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </Card>
  );
}
