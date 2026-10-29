"use client";

import Link from "next/link";
import { ArrowRight, Dumbbell, Salad, Scale } from "lucide-react";
import { useStore } from "@/lib/store/provider";
import { currentWeight, entryVolume, judge, macroTargets, mealTotals } from "@/lib/calc";
import { labelDay, labelMD, today, weekStart } from "@/lib/dates";
import { fmt, round1 } from "@/lib/utils";
import { BodyMap } from "@/components/body-map";
import { MacroCard } from "@/components/macro-card";
import { Stat } from "@/components/stat";
import { DayBars, useWeek } from "@/components/volume-utils";
import { Button } from "@/components/ui/button";
import { buildDemoData } from "@/lib/demo-data";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { workouts, meals, inbody, goals, getExercise, mode, ready, saveWorkout, saveMeal, saveInbody } = useStore();
  const isEmpty = ready && workouts.length === 0 && meals.length === 0 && inbody.length === 0;
  const loadDemo = () => {
    const d = buildDemoData();
    d.workouts.forEach(saveWorkout);
    d.meals.forEach(saveMeal);
    d.inbody.forEach(saveInbody);
  };
  const t = today();
  const { cur, prev, intensity } = useWeek(weekStart(t));

  const todayW = workouts.filter((w) => w.date === t);
  const todayVolume = todayW.reduce((s, w) => s + entryVolume(w, getExercise(w.exerciseId), goals.bodyWeight), 0);
  const todayMeals = meals.filter((m) => m.date === t);
  const totals = mealTotals(todayMeals);
  const weight = currentWeight(goals, inbody);
  const targets = macroTargets(goals, weight);
  const verdicts = {
    protein: judge(totals.protein, targets.protein, "protein"),
    carbs: judge(totals.carbs, targets.carbs, "carbs"),
    fat: judge(totals.fat, targets.fat, "fat"),
    kcal: judge(totals.kcal, targets.kcal, "kcal"),
  };
  const latest = [...inbody].sort((a, b) => b.date.localeCompare(a.date))[0];
  const delta = prev.totalVolume ? ((cur.totalVolume - prev.totalVolume) / prev.totalVolume) * 100 : null;

  return (
    <div className="space-y-3">
      <div className="mb-5">
        <div className="text-[13px] text-muted-foreground">{labelDay(t)}</div>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
          {delta !== null && delta > 0
            ? `이번 주 볼륨, 지난주보다 ${round1(delta)}% 올랐어요`
            : todayW.length
              ? "오늘도 한 칸 더 올렸어요"
              : "오늘은 어떤 운동 하세요?"}
        </h1>
      </div>

      {mode === "local" && isEmpty && (
        <Card className="flex items-center justify-between gap-3 border-primary/30 bg-primary/[0.06] p-4">
          <div>
            <div className="text-sm font-medium">처음이시죠? 샘플 기록으로 먼저 둘러보세요</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">2주치 운동·식단·인바디가 채워져요. 설정에서 언제든 지울 수 있어요.</div>
          </div>
          <Button size="sm" onClick={loadDemo}>
            <Sparkles /> 채우기
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <QuickLink href="/workout" icon={<Dumbbell className="size-4" />} label="운동 기록" />
        <QuickLink href="/diet" icon={<Salad className="size-4" />} label="식단 추가" />
        <QuickLink href="/inbody" icon={<Scale className="size-4" />} label="인바디" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>오늘 운동</CardTitle>
          <Link href="/workout" className="text-[12px] text-muted-foreground hover:text-foreground">
            기록하기 <ArrowRight className="inline size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {todayW.length ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="볼륨" value={fmt(todayVolume)} unit="kg" />
                <Stat label="세트" value={todayW.reduce((s, w) => s + w.sets.length, 0)} unit="세트" />
                <Stat label="종목" value={todayW.length} unit="개" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {todayW.map((w) => (
                  <span key={w.id} className="rounded-md border border-border bg-secondary px-2 py-1 text-[12px]">
                    {getExercise(w.exerciseId)?.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">아직 오늘 기록이 없어요. 지난 루틴을 불러오면 금방이에요.</p>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 mt-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">오늘 식단</h2>
          <Link href="/diet" className="text-[12px] text-muted-foreground hover:text-foreground">
            자세히 <ArrowRight className="inline size-3" />
          </Link>
        </div>
        <MacroCard totals={totals} targets={targets} verdicts={verdicts} />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <div>
            <CardTitle>이번 주</CardTitle>
            <CardDescription className="num">
              {fmt(cur.totalVolume)}kg · {cur.totalSets}세트
            </CardDescription>
          </div>
          <Link href="/volume" className="text-[12px] text-muted-foreground hover:text-foreground">
            주간 볼륨 <ArrowRight className="inline size-3" />
          </Link>
        </CardHeader>
        <CardContent className="grid items-center gap-4 sm:grid-cols-[1fr_220px]">
          <DayBars days={cur.days} prevDays={prev.days} />
          <BodyMap values={intensity} className="mx-auto w-full max-w-[220px]" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>최근 인바디</CardTitle>
          <Link href="/inbody" className="text-[12px] text-muted-foreground hover:text-foreground">
            기록 <ArrowRight className="inline size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {latest ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label={`체중 · ${labelMD(latest.date)}`} value={latest.weight} unit="kg" />
              <Stat label="골격근량" value={latest.skeletalMuscle ?? "-"} unit={latest.skeletalMuscle ? "kg" : undefined} />
              <Stat label="체지방률" value={latest.bodyFatPct ?? "-"} unit={latest.bodyFatPct ? "%" : undefined} />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">
                체중을 기록하면 단백질 목표가 체중에 맞춰 자동으로 바뀌어요.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link href="/inbody">기록하기</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card px-3 py-3 text-[13px] font-medium transition-colors hover:border-primary/40"
    >
      <span className="rounded-md bg-primary/15 p-1.5 text-[#a5acf0]">{icon}</span>
      {label}
    </Link>
  );
}
