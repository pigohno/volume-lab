"use client";

import * as React from "react";
import { Copy, Minus, Plus, Salad, Trash2 } from "lucide-react";
import type { MealEntry, MealSlot } from "@/lib/types";
import { useStore } from "@/lib/store/provider";
import { currentWeight, judge, macroTargets, mealTotals, type MacroTotals } from "@/lib/calc";
import { labelDay, shiftDays, today } from "@/lib/dates";
import type { DietShareData } from "@/lib/share-types";
import { cn, fmt, round1 } from "@/lib/utils";
import { PageHeader } from "@/components/app-shell";
import { MacroCard } from "@/components/macro-card";
import { DateNav } from "@/components/date-nav";
import { FoodPicker, MEAL_LABEL } from "@/components/food-picker";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export default function DietPage() {
  const { meals, goals, inbody, saveMeal } = useStore();
  const [date, setDate] = React.useState(today);
  const [picker, setPicker] = React.useState<MealSlot | null>(null);
  const [editing, setEditing] = React.useState<MealEntry | null>(null);

  const dayMeals = meals.filter((m) => m.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const totals = mealTotals(dayMeals);
  const weight = currentWeight(goals, inbody);
  const targets = macroTargets(goals, weight);
  const verdicts = {
    protein: judge(totals.protein, targets.protein, "protein"),
    carbs: judge(totals.carbs, targets.carbs, "carbs"),
    fat: judge(totals.fat, targets.fat, "fat"),
    kcal: judge(totals.kcal, targets.kcal, "kcal"),
  };

  const yesterday = shiftDays(date, -1);
  const yMeals = meals.filter((m) => m.date === yesterday);

  const share: DietShareData = {
    date,
    totals: roundTotals(totals),
    targets,
    verdicts,
    meals: dayMeals.map((m) => ({
      meal: MEAL_LABEL[m.meal],
      name: `${m.food.brand ? m.food.brand + " " : ""}${m.food.name}`,
      protein: round1(m.food.protein * m.servings),
    })),
  };

  return (
    <>
      <PageHeader
        title="식단"
        description={`체중 ${weight}kg 기준 목표로 판정해요`}
        action={<ShareButton kind="diet" title={`${labelDay(date)} 식단`} data={share} disabled={dayMeals.length === 0} />}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <DateNav value={date} onChange={setDate} />
        <Button onClick={() => setPicker("snack")}>
          <Plus /> 음식 추가
        </Button>
      </div>

      <MacroCard totals={totals} targets={targets} verdicts={verdicts} />

      <div className="mt-3 space-y-3">
        {SLOTS.map((slot) => {
          const items = dayMeals.filter((m) => m.meal === slot);
          const t = mealTotals(items);
          return (
            <Card key={slot}>
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{MEAL_LABEL[slot]}</span>
                  {items.length > 0 && (
                    <span className="num text-[11px] text-muted-foreground">
                      단백질 {round1(t.protein)}g · {fmt(t.kcal)}kcal
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setPicker(slot)} aria-label={`${MEAL_LABEL[slot]} 추가`}>
                  <Plus />
                </Button>
              </div>
              {items.length === 0 ? (
                <button
                  onClick={() => setPicker(slot)}
                  className="mx-4 mb-3 mt-1 block w-[calc(100%-2rem)] rounded-lg border border-dashed border-border py-2.5 text-[12px] text-muted-foreground hover:text-foreground"
                >
                  + 추가
                </button>
              ) : (
                <ul className="pb-1.5">
                  {items.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => setEditing(m)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px]">
                            {m.food.brand && <span className="text-muted-foreground">{m.food.brand} </span>}
                            {m.food.name}
                          </div>
                          <div className="num text-[11px] text-muted-foreground">
                            {round1(m.servings * m.food.servingSize)}
                            {m.food.servingUnit} · {fmt(m.food.kcal * m.servings)}kcal
                          </div>
                        </div>
                        <span className="num text-[13px] font-medium text-[#a5acf0]">{round1(m.food.protein * m.servings)}g</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}

        {dayMeals.length === 0 && yMeals.length > 0 && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              const base = Date.now();
              yMeals.forEach((m, i) =>
                saveMeal({ ...m, id: crypto.randomUUID(), date, createdAt: new Date(base + i).toISOString() }),
              );
            }}
          >
            <Copy /> 어제 식단 그대로 불러오기 ({yMeals.length}개)
          </Button>
        )}
        {dayMeals.length === 0 && yMeals.length === 0 && (
          <p className="flex items-center justify-center gap-1.5 py-4 text-[12px] text-muted-foreground">
            <Salad className="size-4" /> 단백질 g으로 검색하면 남은 목표를 채울 상품을 바로 찾을 수 있어요
          </p>
        )}
      </div>

      <FoodPicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        date={date}
        defaultMeal={picker ?? "snack"}
        remainingProtein={Math.max(0, targets.protein - totals.protein)}
      />
      <EditMealDialog entry={editing} onClose={() => setEditing(null)} />
    </>
  );
}

const roundTotals = (t: MacroTotals): MacroTotals => ({
  kcal: Math.round(t.kcal),
  protein: round1(t.protein),
  carbs: round1(t.carbs),
  fat: round1(t.fat),
});

function EditMealDialog({ entry, onClose }: { entry: MealEntry | null; onClose: () => void }) {
  const { saveMeal, deleteMeal } = useStore();
  const [servings, setServings] = React.useState(1);
  const [meal, setMeal] = React.useState<MealSlot>("snack");

  React.useEffect(() => {
    if (entry) {
      setServings(entry.servings);
      setMeal(entry.meal);
    }
  }, [entry]);

  if (!entry) return null;
  const f = entry.food;
  const step = (d: number) => setServings((s) => Math.max(0.25, round1((s + d) * 100) / 100));

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="식단 수정" description={`${f.brand ? f.brand + " " : ""}${f.name}`}>
        <div className="space-y-5">
          <div className="flex gap-1.5">
            {SLOTS.map((k) => (
              <button
                key={k}
                onClick={() => setMeal(k)}
                className={cn(
                  "flex-1 rounded-full border py-1.5 text-[13px]",
                  meal === k ? "border-primary/50 bg-primary/20" : "border-border text-muted-foreground",
                )}
              >
                {MEAL_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button variant="secondary" size="icon" onClick={() => step(-0.5)} aria-label="줄이기">
              <Minus />
            </Button>
            <div className="text-center">
              <div className="num text-3xl font-semibold">{servings}</div>
              <div className="num text-[11px] text-muted-foreground">
                인분 · {round1(servings * f.servingSize)}
                {f.servingUnit}
              </div>
            </div>
            <Button variant="secondary" size="icon" onClick={() => step(0.5)} aria-label="늘리기">
              <Plus />
            </Button>
          </div>
          <div className="num text-center text-[13px] text-muted-foreground">
            단백질 <span className="text-foreground">{round1(f.protein * servings)}g</span> · 탄수 {round1(f.carbs * servings)}g · 지방{" "}
            {round1(f.fat * servings)}g · {fmt(f.kcal * servings)}kcal
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                deleteMeal(entry.id);
                onClose();
              }}
            >
              <Trash2 /> 삭제
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                saveMeal({ ...entry, servings, meal });
                onClose();
              }}
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
