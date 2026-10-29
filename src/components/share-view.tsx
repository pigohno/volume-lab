"use client";

import * as React from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import type { SharePayload } from "@/lib/types";
import type { DietShareData, InbodyShareData, VolumeShareData } from "@/lib/share-types";
import { decodeShare } from "@/lib/store/share-codec";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";
import { MUSCLE_LABEL } from "@/lib/muscles";
import { VERDICT_LABEL, type Verdict } from "@/lib/calc";
import { labelDay, labelMD, labelWeek } from "@/lib/dates";
import { cn, fmt, round1 } from "@/lib/utils";
import { BodyMap } from "./body-map";
import { DayBars } from "./volume-utils";
import { Logo } from "./app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

async function load(id: string): Promise<SharePayload | null> {
  if (id.startsWith("l.")) return decodeShare(id);
  if (!supabaseEnabled) return null;
  const { data } = await getSupabase().from("vl_shares").select("payload").eq("id", id).maybeSingle();
  return (data?.payload as SharePayload) ?? null;
}

export function ShareView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [payload, setPayload] = React.useState<SharePayload | null | undefined>(undefined);
  const [saving, setSaving] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    load(decodeURIComponent(id)).then(setPayload).catch(() => setPayload(null));
  }, [id]);

  async function saveImage() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#08090a" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `volume-lab-${payload?.kind ?? "share"}.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  }

  if (payload === undefined)
    return <div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  if (payload === null)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm">공유 링크를 찾을 수 없어요.</p>
        <Link href="/" className="mt-3 inline-block text-[13px] text-[#a5acf0]">
          Volume Lab으로 가기
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div ref={cardRef} className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Logo className="size-4" /> Volume Lab
          </div>
          <span className="text-[11px] text-muted-foreground">{payload.title}</span>
        </div>
        {payload.kind === "volume" && <VolumeShare d={payload.data as VolumeShareData} />}
        {payload.kind === "diet" && <DietShare d={payload.data as DietShareData} />}
        {payload.kind === "inbody" && <InbodyShare d={payload.data as InbodyShareData} />}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={saveImage} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Download />} 이미지로 저장
        </Button>
        <Button asChild className="flex-1">
          <Link href="/">나도 기록하기</Link>
        </Button>
      </div>
    </div>
  );
}

function Big({ value, unit, label }: { value: React.ReactNode; unit?: string; label: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="num text-2xl font-semibold tracking-tight">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function VolumeShare({ d }: { d: VolumeShareData }) {
  return (
    <div className="space-y-5">
      <div className="text-[13px] text-muted-foreground">{labelWeek(d.weekStart)}</div>
      <div className="grid grid-cols-3 gap-3">
        <Big label="총 볼륨" value={fmt(d.totalVolume)} unit="kg" />
        <Big label="세트" value={d.totalSets} />
        <Big
          label="지난주 대비"
          value={
            d.vsLastWeek === null ? (
              "-"
            ) : (
              <span className={d.vsLastWeek >= 0 ? "text-success" : "text-destructive"}>
                {d.vsLastWeek > 0 ? "+" : ""}
                {d.vsLastWeek}%
              </span>
            )
          }
        />
      </div>
      <DayBars days={d.days} />
      <BodyMap values={d.intensity} />
      {d.topMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.topMuscles.map((m) => (
            <span
              key={m.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px]",
                d.stimulated.includes(m.id) ? "border-primary/50 bg-primary/20" : "border-border",
              )}
            >
              {MUSCLE_LABEL[m.id]} <span className="num text-muted-foreground">{round1(m.sets)}세트</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT_CLASS: Record<Verdict, string> = {
  under: "text-warning",
  ok: "text-success",
  over: "text-destructive",
};

function DietShare({ d }: { d: DietShareData }) {
  const rows = [
    { k: "protein", label: "단백질", unit: "g", bar: "bg-[#7c84e8]" },
    { k: "carbs", label: "탄수화물", unit: "g", bar: "bg-[#4cb782]" },
    { k: "fat", label: "지방", unit: "g", bar: "bg-[#f2c94c]" },
    { k: "kcal", label: "칼로리", unit: "kcal", bar: "bg-muted-foreground" },
  ] as const;
  const allOk = Object.values(d.verdicts).every((v) => v === "ok");
  return (
    <div className="space-y-5">
      <div className="text-[13px] text-muted-foreground">{labelDay(d.date)}</div>
      <div className="text-lg font-semibold">
        {allOk ? "오늘 영양 목표 모두 충족 ✅" : d.verdicts.protein === "ok" ? "단백질 목표 충족 💪" : "단백질이 조금 부족했어요"}
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.k}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span>{r.label}</span>
              <span className="num">
                {r.k === "kcal" ? fmt(d.totals.kcal) : d.totals[r.k]}
                <span className="text-muted-foreground">
                  /{r.k === "kcal" ? fmt(d.targets.kcal) : d.targets[r.k]}
                  {r.unit}
                </span>
                <span className={cn("ml-2 font-medium", VERDICT_CLASS[d.verdicts[r.k]])}>{VERDICT_LABEL[d.verdicts[r.k]]}</span>
              </span>
            </div>
            <Progress value={(d.totals[r.k] / Math.max(1, d.targets[r.k])) * 100} barClassName={r.bar} />
          </div>
        ))}
      </div>
      {d.meals && d.meals.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-3 text-[12px]">
          {d.meals.map((m, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">
                <span className="text-muted-foreground">{m.meal}</span> {m.name}
              </span>
              <span className="num shrink-0 text-muted-foreground">{m.protein}g</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InbodyShare({ d }: { d: InbodyShareData }) {
  const rs = d.records;
  const last = rs.at(-1);
  const first = rs[0];
  if (!last) return null;
  const diff = round1(last.weight - first.weight);
  const min = Math.min(...rs.map((r) => r.weight));
  const max = Math.max(...rs.map((r) => r.weight));
  const span = max - min || 1;
  const W = 320;
  const H = 90;
  const pts = rs.map((r, i) => [rs.length === 1 ? W / 2 : (i / (rs.length - 1)) * (W - 16) + 8, H - 10 - ((r.weight - min) / span) * (H - 24)]);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Big label={`체중 · ${labelMD(last.date)}`} value={last.weight} unit="kg" />
        <Big label={`${labelMD(first.date)} 이후`} value={`${diff > 0 ? "+" : ""}${diff}`} unit="kg" />
        {!d.weightOnly && last.skeletalMuscle ? (
          <Big label="골격근량" value={last.skeletalMuscle} unit="kg" />
        ) : (
          <Big label="기록" value={rs.length} unit="회" />
        )}
      </div>
      {rs.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full">
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="var(--primary)" />
          ))}
        </svg>
      )}
      {!d.weightOnly && last.bodyFatPct !== undefined && (
        <div className="text-[12px] text-muted-foreground">체지방률 {last.bodyFatPct}%</div>
      )}
    </div>
  );
}
