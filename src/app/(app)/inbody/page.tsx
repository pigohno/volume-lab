"use client";

import * as React from "react";
import { Link2, Plus, Scale, Trash2 } from "lucide-react";
import type { InbodyRecord } from "@/lib/types";
import type { InbodyShareData } from "@/lib/share-types";
import { useStore } from "@/lib/store/provider";
import { labelDay, labelMD, today } from "@/lib/dates";
import { cn, round1, uid } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { Chip } from "@/components/exercise-picker";
import { ShareButton } from "@/components/share-button";
import { Empty, Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Metric = "weight" | "skeletalMuscle" | "bodyFatPct";

const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: "weight", label: "체중", unit: "kg" },
  { id: "skeletalMuscle", label: "골격근량", unit: "kg" },
  { id: "bodyFatPct", label: "체지방률", unit: "%" },
];

/** 체지방률은 직접 입력값이 없으면 체지방량/체중으로 계산해서 씁니다. */
function fatPct(r: InbodyRecord): number | undefined {
  if (r.bodyFatPct != null) return r.bodyFatPct;
  if (r.bodyFatMass != null && r.weight > 0) return round1((r.bodyFatMass / r.weight) * 100);
  return undefined;
}

function metricValue(r: InbodyRecord, m: Metric): number | undefined {
  if (m === "weight") return r.weight;
  if (m === "skeletalMuscle") return r.skeletalMuscle;
  return fatPct(r);
}

const byDateAsc = (a: InbodyRecord, b: InbodyRecord) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

export default function InbodyPage() {
  const { inbody, ready } = useStore();
  const [editing, setEditing] = React.useState<InbodyRecord | null>(null);
  const [open, setOpen] = React.useState(false);
  const [weightOnly, setWeightOnly] = React.useState(true);

  const asc = React.useMemo(() => [...inbody].sort(byDateAsc), [inbody]);
  const desc = React.useMemo(() => [...asc].reverse(), [asc]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (r: InbodyRecord) => {
    setEditing(r);
    setOpen(true);
  };

  const shareData: InbodyShareData = {
    weightOnly,
    records: asc.slice(-12).map((r) =>
      weightOnly
        ? { date: r.date, weight: r.weight }
        : { date: r.date, weight: r.weight, skeletalMuscle: r.skeletalMuscle, bodyFatPct: fatPct(r) },
    ),
  };

  return (
    <>
      <PageHeader
        title="인바디"
        description="체성분을 기록하고 변화를 확인하세요"
        action={
          <Button onClick={openNew}>
            <Plus /> 기록 추가
          </Button>
        }
      />

      <div className="space-y-3">
        {ready && asc.length === 0 && (
          <Empty icon={<Scale className="size-6" />} title="아직 인바디 기록이 없어요">
            체중만 적어도 괜찮아요. 꾸준히 쌓이면 변화가 그래프로 보여요.
            <div className="mt-3">
              <Button size="sm" onClick={openNew}>
                <Plus /> 첫 기록 남기기
              </Button>
            </div>
          </Empty>
        )}

        {asc.length > 0 && (
          <>
            <LatestCard latest={desc[0]} prev={desc[1]} />
            <TrendCard records={asc} />

            <Card className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium">기록 공유하기</div>
                <div className="text-[11px] text-muted-foreground">최근 {shareData.records.length}개 기록을 링크로 보내요</div>
              </div>
              <div className="flex items-center gap-2">
                <Chip active={weightOnly} onClick={() => setWeightOnly((v) => !v)}>
                  몸무게만 공유
                </Chip>
                <ShareButton kind="inbody" title="인바디 기록" data={shareData} />
              </div>
            </Card>

            <HistoryCard records={desc} onPick={openEdit} />
          </>
        )}

        <Card className="flex gap-3 border-dashed bg-transparent px-4 py-3.5">
          <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-[13px] font-medium">인바디 연동</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              지금은 결과지를 보고 직접 입력하는 방식이에요. InBody(LookinBody) 자동 연동은 파트너 API 승인이 필요해서,
              승인되면 추가할 예정이에요.
            </p>
          </div>
        </Card>
      </div>

      <InbodyDialog open={open} onOpenChange={setOpen} record={editing} />
    </>
  );
}

// ─────────────────────────── 최신 요약 ───────────────────────────

function Delta({ cur, prev, unit, good }: { cur?: number; prev?: number; unit: string; good?: "up" | "down" }) {
  if (cur == null || prev == null) return <span>이전 기록 없음</span>;
  const d = round1(cur - prev);
  const sign = d > 0 ? "+" : "";
  let color = "";
  if (good && d !== 0) {
    const better = good === "up" ? d > 0 : d < 0;
    color = better ? "text-success" : "text-destructive";
  }
  return (
    <span className={cn("num", color)}>
      {d === 0 ? "변화 없음" : `${sign}${d}${unit}`}
    </span>
  );
}

function LatestCard({ latest, prev }: { latest: InbodyRecord; prev?: InbodyRecord }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>최근 측정 · {labelDay(latest.date)}</span>
        {prev && <span>{labelMD(prev.date)} 대비</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="체중"
          value={latest.weight}
          unit="kg"
          sub={<Delta cur={latest.weight} prev={prev?.weight} unit="kg" />}
        />
        <Stat
          label="골격근량"
          value={latest.skeletalMuscle ?? "-"}
          unit={latest.skeletalMuscle != null ? "kg" : undefined}
          sub={<Delta cur={latest.skeletalMuscle} prev={prev?.skeletalMuscle} unit="kg" good="up" />}
        />
        <Stat
          label="체지방률"
          value={fatPct(latest) ?? "-"}
          unit={fatPct(latest) != null ? "%" : undefined}
          sub={<Delta cur={fatPct(latest)} prev={prev ? fatPct(prev) : undefined} unit="%p" good="down" />}
        />
      </div>
    </Card>
  );
}

// ─────────────────────────── 추이 차트 ───────────────────────────

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function TrendCard({ records }: { records: InbodyRecord[] }) {
  const [metric, setMetric] = React.useState<Metric>("weight");
  const meta = METRICS.find((m) => m.id === metric)!;
  const points = records
    .map((r) => ({ date: r.date, v: metricValue(r, metric) }))
    .filter((p): p is { date: string; v: number } => p.v != null);

  return (
    <Card className="px-4 pb-3 pt-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-medium">변화 추이</div>
        <div className="flex gap-1.5">
          {METRICS.map((m) => (
            <Chip key={m.id} active={metric === m.id} onClick={() => setMetric(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>
      {points.length >= 2 ? (
        <LineChart points={points} unit={meta.unit} />
      ) : (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          {points.length === 0
            ? `${meta.label} 값이 들어간 기록이 아직 없어요.`
            : "기록이 두 개 이상 쌓이면 그래프로 보여드릴게요."}
        </p>
      )}
    </Card>
  );
}

function LineChart({ points, unit }: { points: { date: string; v: number }[]; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const h = 168;
  const pad = { l: 8, r: 44, t: 18, b: 22 };
  const w = Math.max(width, 200);

  const vals = points.map((p) => p.v);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const margin = (rawMax - rawMin) * 0.15 || 1;
  const min = rawMin - margin;
  const max = rawMax + margin;

  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * innerH;

  const xy = points.map((p, i) => [x(i), y(p.v)] as const);
  const line = xy.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${xy.at(-1)![0].toFixed(1)},${pad.t + innerH} L${xy[0][0].toFixed(1)},${pad.t + innerH} Z`;

  const iMax = vals.indexOf(rawMax);
  const iMin = vals.indexOf(rawMin);
  const last = points.length - 1;
  const showDots = points.length <= 24;

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block overflow-visible" role="img">
          {/* 최소/최대 가이드 라인 */}
          {[rawMax, rawMin].map((v, k) => (
            <g key={k}>
              <line
                x1={pad.l}
                x2={pad.l + innerW}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <text
                x={pad.l + innerW + 6}
                y={y(v) + 3.5}
                className="num fill-muted-foreground text-[10px]"
              >
                {k === 0 ? "최고" : "최저"} {round1(v)}
              </text>
            </g>
          ))}

          <path d={area} fill="var(--primary)" opacity="0.1" />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {showDots &&
            xy.map(([px, py], i) => (
              <circle
                key={i}
                cx={px}
                cy={py}
                r={i === last ? 4 : 2.5}
                fill={i === last ? "var(--primary)" : "var(--card)"}
                stroke="var(--primary)"
                strokeWidth="1.5"
              />
            ))}
          {!showDots && <circle cx={xy[last][0]} cy={xy[last][1]} r={4} fill="var(--primary)" />}

          {/* 최고/최저 점 강조 (마지막 점과 겹치지 않을 때만) */}
          {[iMax, iMin]
            .filter((i, k, arr) => i !== last && arr.indexOf(i) === k)
            .map((i) => (
              <circle key={`m${i}`} cx={xy[i][0]} cy={xy[i][1]} r={3.5} fill="none" stroke="var(--muted-foreground)" />
            ))}

          {/* 마지막 값 라벨 */}
          <text
            x={Math.min(xy[last][0], pad.l + innerW)}
            y={Math.max(xy[last][1] - 9, 10)}
            textAnchor="end"
            className="num fill-foreground text-[11px] font-semibold"
          >
            {round1(points[last].v)}
            {unit}
          </text>

          {/* x축: 처음 · 마지막 날짜 */}
          <text x={xy[0][0]} y={h - 4} className="num fill-muted-foreground text-[10px]">
            {labelMD(points[0].date)}
          </text>
          <text x={xy[last][0]} y={h - 4} textAnchor="end" className="num fill-muted-foreground text-[10px]">
            {labelMD(points[last].date)}
          </text>
        </svg>
      )}
      {width === 0 && <div style={{ height: h }} />}
    </div>
  );
}

// ─────────────────────────── 기록 목록 ───────────────────────────

function HistoryCard({ records, onPick }: { records: InbodyRecord[]; onPick: (r: InbodyRecord) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
        <span>날짜</span>
        <span className="text-right">체중</span>
        <span className="text-right">골격근</span>
        <span className="text-right">체지방률</span>
      </div>
      <div className="divide-y divide-border">
        {records.map((r) => {
          const pbf = fatPct(r);
          return (
            <button
              key={r.id}
              onClick={() => onPick(r)}
              className="grid w-full grid-cols-[1fr_4rem_4rem_4rem] items-center gap-2 px-4 py-2.5 text-left text-[13px] hover:bg-accent/60"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{labelDay(r.date)}</span>
                {r.note && <span className="block truncate text-[11px] text-muted-foreground">{r.note}</span>}
              </span>
              <span className="num text-right">{r.weight}</span>
              <span className="num text-right text-muted-foreground">{r.skeletalMuscle ?? "-"}</span>
              <span className="num text-right text-muted-foreground">{pbf != null ? `${pbf}%` : "-"}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────── 입력 다이얼로그 ───────────────────────────

interface FormState {
  date: string;
  weight: string;
  skeletalMuscle: string;
  bodyFatMass: string;
  bodyFatPct: string;
  note: string;
}

const str = (n?: number) => (n == null ? "" : String(n));
const num = (s: string) => {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function toForm(r: InbodyRecord | null): FormState {
  return {
    date: r?.date ?? today(),
    weight: str(r?.weight),
    skeletalMuscle: str(r?.skeletalMuscle),
    bodyFatMass: str(r?.bodyFatMass),
    bodyFatPct: str(r?.bodyFatPct),
    note: r?.note ?? "",
  };
}

function InbodyDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: InbodyRecord | null;
}) {
  const { saveInbody, deleteInbody } = useStore();
  const [form, setForm] = React.useState<FormState>(() => toForm(record));

  React.useEffect(() => {
    if (open) setForm(toForm(record));
  }, [open, record]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const weight = num(form.weight);
  const fatMass = num(form.bodyFatMass);
  const autoPct = weight && fatMass && fatMass < weight ? round1((fatMass / weight) * 100) : undefined;
  const canSave = Boolean(weight && form.date);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    saveInbody({
      id: record?.id ?? uid(),
      date: form.date,
      weight,
      skeletalMuscle: num(form.skeletalMuscle),
      bodyFatMass: fatMass,
      bodyFatPct: num(form.bodyFatPct) ?? autoPct,
      note: form.note.trim() || undefined,
      createdAt: record?.createdAt ?? new Date().toISOString(),
    });
    onOpenChange(false);
  };

  const remove = () => {
    if (!record) return;
    deleteInbody(record.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={record ? "인바디 기록 수정" : "인바디 기록 추가"}
        description="체중만 넣어도 저장돼요. 나머지는 결과지에 있으면 채워주세요."
      >
        <form onSubmit={submit} className="space-y-3.5 pt-1">
          <Field label="날짜">
            <Input type="date" value={form.date} max={today()} onChange={set("date")} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="체중 (kg) *">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.weight}
                onChange={set("weight")}
                placeholder="예: 72.4"
                className="num"
                required
              />
            </Field>
            <Field label="골격근량 (kg)">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.skeletalMuscle}
                onChange={set("skeletalMuscle")}
                placeholder="선택"
                className="num"
              />
            </Field>
            <Field label="체지방량 (kg)">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.bodyFatMass}
                onChange={set("bodyFatMass")}
                placeholder="선택"
                className="num"
              />
            </Field>
            <Field label="체지방률 (%)">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.bodyFatPct}
                onChange={set("bodyFatPct")}
                placeholder={autoPct != null ? `${autoPct} (자동 계산)` : "선택"}
                className="num"
              />
            </Field>
          </div>
          {autoPct != null && form.bodyFatPct === "" && (
            <p className="-mt-1.5 text-[11px] text-muted-foreground">
              비워두면 체지방량 기준으로 <span className="num text-foreground/80">{autoPct}%</span>로 저장해요.
            </p>
          )}
          <Field label="메모">
            <Input value={form.note} onChange={set("note")} placeholder="예: 아침 공복, 운동 전" />
          </Field>

          <div className="flex gap-2 pt-1">
            {record && (
              <Button type="button" variant="destructive" onClick={remove}>
                <Trash2 /> 삭제
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!canSave}>
              {record ? "수정 완료" : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
