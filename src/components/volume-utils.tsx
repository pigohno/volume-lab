"use client";

import * as React from "react";
import type { MuscleId } from "@/lib/types";
import { useStore } from "@/lib/store/provider";
import { MUSCLES } from "@/lib/muscles";
import { muscleIntensity, summarizeWeek, type WeekSummary } from "@/lib/calc";
import { labelShort, shiftDays, today } from "@/lib/dates";
import type { VolumeShareData } from "@/lib/share-types";
import { cn, fmt, round1 } from "@/lib/utils";

export function useWeek(start: string) {
  const { workouts, getExercise, goals } = useStore();
  return React.useMemo(() => {
    const cur = summarizeWeek(start, workouts, getExercise, goals.bodyWeight);
    const prev = summarizeWeek(shiftDays(start, -7), workouts, getExercise, goals.bodyWeight);
    return { cur, prev, intensity: muscleIntensity(cur, goals.weeklySetTarget) };
  }, [start, workouts, getExercise, goals]);
}

export function buildVolumeShare(start: string, cur: WeekSummary, prev: WeekSummary, intensity: Partial<Record<MuscleId, number>>): VolumeShareData {
  return {
    weekStart: start,
    totalVolume: Math.round(cur.totalVolume),
    totalSets: cur.totalSets,
    days: cur.days.map((d) => ({ date: d.date, volume: Math.round(d.volume) })),
    intensity,
    stimulated: Object.keys(cur.stimulated) as MuscleId[],
    topMuscles: MUSCLES.map((m) => ({ id: m.id, sets: cur.muscleSets[m.id] }))
      .filter((x) => x.sets > 0)
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 6),
    vsLastWeek: prev.totalVolume ? round1(((cur.totalVolume - prev.totalVolume) / prev.totalVolume) * 100) : null,
  };
}

export function DayBars({
  days,
  prevDays,
}: {
  days: { date: string; volume: number }[];
  prevDays?: { date: string; volume: number }[];
}) {
  const max = Math.max(1, ...days.map((d) => d.volume), ...(prevDays ?? []).map((d) => d.volume));
  const t = today();
  return (
    <div className="grid h-36 grid-cols-7 items-end gap-2">
      {days.map((d, i) => {
        const h = (d.volume / max) * 100;
        const ph = prevDays ? (prevDays[i].volume / max) * 100 : 0;
        return (
          <div key={d.date} className="flex h-full flex-col items-center justify-end gap-1.5">
            <span className="num text-[10px] text-muted-foreground">{d.volume ? fmt(d.volume / 1000, 1) + "t" : ""}</span>
            <div className="relative flex w-full flex-1 items-end justify-center">
              {prevDays && ph > 0 && (
                <div className="absolute bottom-0 w-full max-w-7 rounded-t-[4px] border border-dashed border-border" style={{ height: `${ph}%` }} />
              )}
              <div
                className="relative w-full max-w-7 rounded-t-[4px] bg-gradient-to-t from-primary/70 to-[#8b93f0] transition-[height] duration-500"
                style={{ height: `${Math.max(h, d.volume ? 3 : 0)}%` }}
              />
            </div>
            <span className={cn("text-[11px] text-muted-foreground", d.date === t && "font-semibold text-foreground")}>
              {labelShort(d.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
