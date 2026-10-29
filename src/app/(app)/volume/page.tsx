"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { MuscleId } from "@/lib/types";
import { useStore } from "@/lib/store/provider";
import { MUSCLES, MUSCLE_LABEL } from "@/lib/muscles";
import { labelWeek, shiftDays, today, weekStart } from "@/lib/dates";
import { buildVolumeShare, DayBars, useWeek } from "@/components/volume-utils";
import { cn, fmt, round1 } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { BodyMap } from "@/components/body-map";
import { ShareButton } from "@/components/share-button";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function VolumePage() {
  const { goals } = useStore();
  const [start, setStart] = React.useState(() => weekStart(today()));
  const [selected, setSelected] = React.useState<MuscleId | null>(null);
  const { cur, prev, intensity } = useWeek(start);

  const delta = prev.totalVolume ? ((cur.totalVolume - prev.totalVolume) / prev.totalVolume) * 100 : null;
  const isThisWeek = start === weekStart(today());
  const share = buildVolumeShare(start, cur, prev, intensity);

  const rows = MUSCLES.map((m) => ({
    ...m,
    sets: cur.muscleSets[m.id],
    prevSets: prev.muscleSets[m.id],
    stim: cur.stimulated[m.id] ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="주간 볼륨"
        description="부위별 세트 수와 지난주 대비 볼륨 변화를 확인하세요"
        action={<ShareButton kind="volume" title={`${labelWeek(start)} 볼륨`} data={share} disabled={cur.totalSets === 0} />}
      />

      <div className="mb-3 flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => setStart(shiftDays(start, -7))} aria-label="지난주">
          <ChevronLeft />
        </Button>
        <span className="px-1 text-sm font-medium">
          {isThisWeek ? "이번 주 · " : ""}
          {labelWeek(start)}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setStart(shiftDays(start, 7))} aria-label="다음주">
          <ChevronRight />
        </Button>
      </div>

      <div className="grid gap-3">
        <Card className="grid grid-cols-3 gap-3 p-4">
          <Stat
            label="총 볼륨"
            value={fmt(cur.totalVolume)}
            unit="kg"
            sub={
              delta === null ? (
                "지난주 기록 없음"
              ) : (
                <span className={cn("inline-flex items-center gap-0.5", delta >= 0 ? "text-success" : "text-destructive")}>
                  {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  지난주 대비 {delta > 0 ? "+" : ""}
                  {round1(delta)}%
                </span>
              )
            }
          />
          <Stat label="세트" value={cur.totalSets} unit="세트" sub={`지난주 ${prev.totalSets}세트`} />
          <Stat label="종목" value={cur.exerciseCount} unit="개" sub={`${cur.days.filter((d) => d.sets > 0).length}일 운동`} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>요일별 볼륨</CardTitle>
            <CardDescription>막대 = 그날 총 볼륨</CardDescription>
          </CardHeader>
          <CardContent>
            <DayBars days={cur.days} prevDays={prev.days} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>자극 부위 맵</CardTitle>
            <CardDescription>진할수록 목표 세트({goals.weeklySetTarget}세트)에 가까워요</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <BodyMap
              values={intensity}
              selected={selected}
              onSelect={(m) => setSelected((s) => (s === m ? null : m))}
              className="mx-auto max-w-md"
            />
            {selected && (
              <div className="mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-[13px]">
                <span className="font-medium">{MUSCLE_LABEL[selected]}</span>
                <span className="num ml-2 text-muted-foreground">
                  {round1(cur.muscleSets[selected])}세트 · {fmt(cur.muscleVolume[selected])}kg
                  {cur.stimulated[selected] ? ` · 자극 체크 ${cur.stimulated[selected]}회` : ""}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>부위별 주간 세트</CardTitle>
            <CardDescription>주동근 1세트, 협응근 0.5세트로 계산해요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r) => {
              const pct = (r.sets / goals.weeklySetTarget) * 100;
              const d = r.sets - r.prevSets;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={cn(
                    "grid w-full grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 text-left",
                    r.sets === 0 && "opacity-45",
                  )}
                >
                  <span className="truncate text-[13px]">
                    {r.label}
                    {r.stim > 0 && <span className="ml-1 text-[10px] text-[#a5acf0]">●</span>}
                  </span>
                  <Progress
                    value={pct}
                    barClassName={pct >= 100 ? "bg-success" : pct >= 60 ? "bg-primary" : "bg-primary/60"}
                  />
                  <span className="num text-right text-[12px]">
                    {round1(r.sets)}
                    <span className="text-muted-foreground">/{goals.weeklySetTarget}</span>
                    {d !== 0 && r.prevSets > 0 && (
                      <span className={cn("ml-1 text-[10px]", d > 0 ? "text-success" : "text-destructive")}>
                        {d > 0 ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
