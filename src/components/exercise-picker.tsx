"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import type { Equipment, Exercise, MuscleId } from "@/lib/types";
import { MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import { multiTokenScore } from "@/lib/search";
import { useStore } from "@/lib/store/provider";
import { cn, uid } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "바벨",
  dumbbell: "덤벨",
  machine: "머신",
  cable: "케이블",
  bodyweight: "맨몸",
  smith: "스미스",
  kettlebell: "케틀벨",
  band: "밴드",
};

const GROUPS = ["전체", "가슴", "등", "어깨", "팔", "코어", "하체"] as const;

function groupOf(m: MuscleId) {
  const g = MUSCLES.find((x) => x.id === m)?.group ?? "";
  return g === "상체 앞" ? "가슴" : g;
}

export function useExerciseSearch(query: string, group: (typeof GROUPS)[number] = "전체") {
  const { allExercises, workouts } = useStore();

  // 자주 한 운동일수록 위로 — 검색어가 같아도 내가 하는 운동이 먼저 보이게
  const freq = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workouts) m.set(w.exerciseId, (m.get(w.exerciseId) ?? 0) + 1);
    return m;
  }, [workouts]);

  return React.useMemo(() => {
    const pool = group === "전체" ? allExercises : allExercises.filter((e) => e.primary.some((m) => groupOf(m) === group));
    const q = query.trim();
    if (!q) {
      return [...pool].sort((a, b) => (freq.get(b.id) ?? 0) - (freq.get(a.id) ?? 0)).slice(0, 60);
    }
    return pool
      .map((e) => ({
        e,
        s:
          multiTokenScore(q, [e.name, e.nameEn, ...e.aliases, EQUIPMENT_LABEL[e.equipment], ...e.primary.map((m) => MUSCLE_LABEL[m])]) +
          Math.min(10, (freq.get(e.id) ?? 0) * 0.5),
      }))
      .filter((x) => x.s > 10)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.e);
  }, [allExercises, freq, group, query]);
}

export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (e: Exercise) => void;
}) {
  const { workouts, getExercise, saveCustomExercise } = useStore();
  const [q, setQ] = React.useState("");
  const [group, setGroup] = React.useState<(typeof GROUPS)[number]>("전체");
  const [creating, setCreating] = React.useState(false);
  const results = useExerciseSearch(q, group);

  const recent = React.useMemo(() => {
    const seen = new Set<string>();
    const out: Exercise[] = [];
    for (const w of [...workouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      if (seen.has(w.exerciseId)) continue;
      seen.add(w.exerciseId);
      const ex = getExercise(w.exerciseId);
      if (ex) out.push(ex);
      if (out.length >= 8) break;
    }
    return out;
  }, [workouts, getExercise]);

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setCreating(false);
      setGroup("전체");
    }
  }, [open]);

  const pick = (e: Exercise) => {
    onPick(e);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="운동 찾기" description="이름, 줄임말(벤프, 랫풀), 초성(ㅂㅊㅍ), 부위로 검색돼요" className="sm:h-[80dvh]">
        {creating ? (
          <CustomExerciseForm
            initialName={q}
            onCancel={() => setCreating(false)}
            onSave={(e) => {
              saveCustomExercise(e);
              pick(e);
            }}
          />
        ) : (
          <>
            <div className="sticky top-0 z-10 -mx-5 space-y-2 bg-popover px-5 pb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="예: 인클 덤벨, 랫풀, ㄹㄱㅍㄹㅅ"
                  className="h-10 pl-9"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                {GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      group === g
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {!q && recent.length > 0 && group === "전체" && (
              <div className="mb-4">
                <div className="mb-2 text-[11px] font-medium text-muted-foreground">최근 한 운동</div>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => pick(e)}
                      className="rounded-md border border-border bg-secondary px-2.5 py-1.5 text-[13px] hover:border-primary/40"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="-mx-2">
              {results.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => pick(e)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {e.primary.map((m) => MUSCLE_LABEL[m]).join(" · ")}
                        {e.secondary.length > 0 && (
                          <span className="opacity-60"> + {e.secondary.map((m) => MUSCLE_LABEL[m]).join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{EQUIPMENT_LABEL[e.equipment]}</Badge>
                  </button>
                </li>
              ))}
            </ul>

            {results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">찾는 운동이 없어요.</p>
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
              <Plus /> {q ? `“${q}” 직접 추가` : "운동 직접 추가"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomExerciseForm({
  initialName,
  onSave,
  onCancel,
}: {
  initialName: string;
  onSave: (e: Exercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initialName);
  const [equipment, setEquipment] = React.useState<Equipment>("machine");
  const [primary, setPrimary] = React.useState<MuscleId[]>([]);

  const toggle = (m: MuscleId) => setPrimary((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">운동 이름</div>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 해머 아이소 로우" />
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">기구</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((k) => (
            <Chip key={k} active={equipment === k} onClick={() => setEquipment(k)}>
              {EQUIPMENT_LABEL[k]}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">주로 쓰는 부위 (볼륨 계산에 쓰여요)</div>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLES.map((m) => (
            <Chip key={m.id} active={primary.includes(m.id)} onClick={() => toggle(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          취소
        </Button>
        <Button
          className="flex-1"
          disabled={!name.trim() || primary.length === 0}
          onClick={() =>
            onSave({
              id: `custom-${uid()}`,
              name: name.trim(),
              nameEn: "",
              aliases: [],
              equipment,
              primary,
              secondary: [],
              custom: true,
            })
          }
        >
          추가
        </Button>
      </div>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "border-primary/50 bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
