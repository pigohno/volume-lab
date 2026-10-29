"use client";

import * as React from "react";
import { toast } from "sonner";
import { Cloud, Download, HardDrive, LogOut } from "lucide-react";
import type { Goals } from "@/lib/types";
import { currentWeight, macroTargets } from "@/lib/calc";
import { today } from "@/lib/dates";
import { useStore } from "@/lib/store/provider";
import { fmt } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { Chip } from "@/components/exercise-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const APP_VERSION = "v0.1";

type GoalForm = Record<keyof Goals, string>;

const PRESETS: { label: string; proteinPerKg: number; carbsPerKg: number; fatPerKg: number }[] = [
  { label: "벌크업", proteinPerKg: 2.0, carbsPerKg: 4.5, fatPerKg: 1.0 },
  { label: "유지", proteinPerKg: 1.8, carbsPerKg: 3.5, fatPerKg: 0.8 },
  { label: "다이어트", proteinPerKg: 2.2, carbsPerKg: 2.0, fatPerKg: 0.6 },
];

const toForm = (g: Goals): GoalForm => ({
  bodyWeight: String(g.bodyWeight),
  proteinPerKg: String(g.proteinPerKg),
  carbsPerKg: String(g.carbsPerKg),
  fatPerKg: String(g.fatPerKg),
  weeklySetTarget: String(g.weeklySetTarget),
});

/** 비었거나 이상한 값은 기존 값으로 되돌립니다. */
function fromForm(f: GoalForm, fallback: Goals): Goals {
  const pick = (k: keyof Goals) => {
    const n = Number(f[k]);
    return f[k].trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback[k];
  };
  return {
    bodyWeight: pick("bodyWeight"),
    proteinPerKg: pick("proteinPerKg"),
    carbsPerKg: pick("carbsPerKg"),
    fatPerKg: pick("fatPerKg"),
    weeklySetTarget: Math.round(pick("weeklySetTarget")),
  };
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" />
      <div className="space-y-3">
        <GoalsCard />
        <AccountCard />
        <DataCard />
        <p className="pt-2 text-center text-[11px] text-muted-foreground/70">Volume Lab {APP_VERSION}</p>
      </div>
    </>
  );
}

// ─────────────────────────── 영양 목표 ───────────────────────────

function GoalsCard() {
  const { goals, saveGoals, inbody } = useStore();
  const [form, setForm] = React.useState<GoalForm>(() => toForm(goals));

  // 저장소에서 목표를 늦게 불러오는 경우에 맞춰 폼을 다시 채웁니다.
  React.useEffect(() => setForm(toForm(goals)), [goals]);

  const draft = fromForm(form, goals);
  const hasInbody = inbody.length > 0;
  const weight = currentWeight(draft, inbody);
  const t = macroTargets(draft, weight);
  const dirty = JSON.stringify(draft) !== JSON.stringify(goals);

  const set = (k: keyof Goals) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyPreset = (p: (typeof PRESETS)[number]) =>
    setForm((f) => ({
      ...f,
      proteinPerKg: String(p.proteinPerKg),
      carbsPerKg: String(p.carbsPerKg),
      fatPerKg: String(p.fatPerKg),
    }));

  const activePreset = PRESETS.find(
    (p) => p.proteinPerKg === draft.proteinPerKg && p.carbsPerKg === draft.carbsPerKg && p.fatPerKg === draft.fatPerKg,
  );

  const save = () => {
    saveGoals(draft);
    toast.success("목표를 저장했어요");
  };

  return (
    <Card className="p-4">
      <div className="text-[15px] font-semibold tracking-tight">영양 목표</div>
      <p className="mt-0.5 text-[12px] text-muted-foreground">체중 1kg당 얼마나 먹을지 정하면 하루 목표가 계산돼요.</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Chip key={p.label} active={activePreset?.label === p.label} onClick={() => applyPreset(p)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumField label="단백질 (g/kg)" value={form.proteinPerKg} onChange={set("proteinPerKg")} step="0.1" />
        <NumField label="탄수화물 (g/kg)" value={form.carbsPerKg} onChange={set("carbsPerKg")} step="0.1" />
        <NumField label="지방 (g/kg)" value={form.fatPerKg} onChange={set("fatPerKg")} step="0.1" />
        <NumField
          label="기준 체중 (kg)"
          value={form.bodyWeight}
          onChange={set("bodyWeight")}
          step="0.1"
          hint={hasInbody ? "인바디 기록이 있어서 지금은 안 쓰여요" : "인바디 기록이 없을 때만 써요"}
        />
        <NumField
          label="부위별 주간 목표 세트"
          value={form.weeklySetTarget}
          onChange={set("weeklySetTarget")}
          step="1"
          inputMode="numeric"
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-[13px]">
        <div className="text-[11px] text-muted-foreground">
          오늘 기준 체중 <span className="num text-foreground">{weight}kg</span>
          {hasInbody ? " (최근 인바디)" : " (설정값)"}
        </div>
        <div className="num mt-1 font-medium">
          단백질 {fmt(t.protein)}g · 탄수 {fmt(t.carbs)}g · 지방 {fmt(t.fat)}g
          <span className="text-muted-foreground"> · 약 {fmt(t.kcal)}kcal</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={save} disabled={!dirty}>
          저장
        </Button>
      </div>
    </Card>
  );
}

function NumField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" inputMode="decimal" min={0} className="num" {...props} />
      {hint && <div className="text-[11px] text-muted-foreground/80">{hint}</div>}
    </div>
  );
}

// ─────────────────────────── 계정 & 저장소 ───────────────────────────

function AccountCard() {
  const { mode, session, signOut } = useStore();
  const [busy, setBusy] = React.useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      toast.error(`로그아웃하지 못했어요: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="text-[15px] font-semibold tracking-tight">계정 & 저장소</div>
      {mode === "local" ? (
        <div className="mt-3 flex gap-3">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-[13px]">
            <div className="font-medium">데모 모드로 쓰고 있어요</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              기록은 지금 이 브라우저에만 저장돼요. 브라우저 데이터를 지우면 함께 사라지니, 가끔 아래에서 백업해 두세요.
              Supabase 환경변수를 넣으면 로그인하고 여러 기기에서 동기화할 수 있어요.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Cloud className="size-4 shrink-0 text-success" />
          <div className="min-w-0 flex-1 text-[13px]">
            <div className="truncate font-medium">{session?.user.email ?? "로그인된 계정"}</div>
            <div className="text-[11px] text-muted-foreground">클라우드에 저장되고 있어요</div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout} disabled={busy}>
            <LogOut /> 로그아웃
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────── 데이터 ───────────────────────────

function DataCard() {
  const { workouts, meals, inbody, goals, customFoods, customExercises, mode } = useStore();

  const exportJson = () => {
    const payload = {
      workouts,
      meals,
      inbody,
      goals,
      customFoods,
      customExercises,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volume-lab-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("백업 파일을 내려받았어요");
  };

  return (
    <Card className="p-4">
      <div className="text-[15px] font-semibold tracking-tight">데이터</div>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        운동 <span className="num">{fmt(workouts.length)}</span> · 식단 <span className="num">{fmt(meals.length)}</span> ·
        인바디 <span className="num">{fmt(inbody.length)}</span>개 기록을 한 파일로 저장해요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportJson}>
          <Download /> JSON으로 내보내기
        </Button>
        {mode === "local" && (
          <Button
            variant="destructive"
            onClick={() => {
              if (!window.confirm("이 브라우저에 저장된 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
              try {
                localStorage.removeItem("volume-lab:v1");
              } catch {}
              window.location.reload();
            }}
          >
            전체 기록 지우기
          </Button>
        )}
      </div>
    </Card>
  );
}
