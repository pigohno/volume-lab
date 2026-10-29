import type { MacroTotals, Verdict } from "@/lib/calc";
import { VERDICT_LABEL } from "@/lib/calc";
import { fmt, round1 } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const VERDICT_VARIANT: Record<Verdict, "warning" | "success" | "destructive"> = {
  under: "warning",
  ok: "success",
  over: "destructive",
};

export function MacroCard({
  totals,
  targets,
  verdicts,
  compact,
}: {
  totals: MacroTotals;
  targets: MacroTotals;
  verdicts: Record<keyof MacroTotals, Verdict>;
  compact?: boolean;
}) {
  const rows: { k: keyof MacroTotals; label: string; unit: string; bar: string }[] = [
    { k: "protein", label: "단백질", unit: "g", bar: "bg-[#7c84e8]" },
    { k: "carbs", label: "탄수화물", unit: "g", bar: "bg-[#4cb782]" },
    { k: "fat", label: "지방", unit: "g", bar: "bg-[#f2c94c]" },
    { k: "kcal", label: "칼로리", unit: "kcal", bar: "bg-muted-foreground" },
  ];
  const left = targets.protein - totals.protein;
  return (
    <Card className="p-4">
      {!compact && (
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground">단백질</div>
            <div className="num mt-0.5 text-3xl font-semibold tracking-tight">
              {round1(totals.protein)}
              <span className="text-base font-normal text-muted-foreground"> / {targets.protein}g</span>
            </div>
          </div>
          <div className="text-right text-[12px] text-muted-foreground">
            {left > 0 ? (
              <>
                <span className="num font-medium text-foreground">{round1(left)}g</span> 더 필요해요
              </>
            ) : (
              <span className="text-success">오늘 단백질 목표 달성 🎉</span>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
            <span className="text-[12px] text-muted-foreground">{r.label}</span>
            <Progress value={(totals[r.k] / Math.max(1, targets[r.k])) * 100} barClassName={r.bar} />
            <div className="flex items-center gap-2">
              <span className="num w-24 text-right text-[12px]">
                {r.k === "kcal" ? fmt(totals.kcal) : round1(totals[r.k])}
                <span className="text-muted-foreground">
                  /{r.k === "kcal" ? fmt(targets.kcal) : targets[r.k]}
                  {r.unit}
                </span>
              </span>
              <Badge variant={VERDICT_VARIANT[verdicts[r.k]]} className="w-10 justify-center">
                {VERDICT_LABEL[verdicts[r.k]]}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

