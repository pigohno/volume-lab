"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labelDay, shiftDays, today } from "@/lib/dates";

export function DateNav({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isToday = value === today();
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftDays(value, -1))} aria-label="전날">
        <ChevronLeft />
      </Button>
      <label className="relative cursor-pointer rounded-md px-2 py-1 text-sm font-medium hover:bg-accent">
        {isToday ? "오늘 · " : ""}
        {labelDay(value)}
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="날짜 선택"
        />
      </label>
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(shiftDays(value, 1))} aria-label="다음날">
        <ChevronRight />
      </Button>
      {!isToday && (
        <Button variant="ghost" size="sm" onClick={() => onChange(today())}>
          오늘
        </Button>
      )}
    </div>
  );
}
