import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const today = () => toKey(new Date());
export const fromKey = (k: string) => parseISO(k);

/** 월요일 시작 주간 */
export function weekStart(key: string) {
  return toKey(startOfWeek(fromKey(key), { weekStartsOn: 1 }));
}

export function weekDays(startKey: string) {
  const s = fromKey(startKey);
  return Array.from({ length: 7 }, (_, i) => toKey(addDays(s, i)));
}

export const shiftDays = (key: string, n: number) => toKey(addDays(fromKey(key), n));

export const labelDay = (key: string) => format(fromKey(key), "M월 d일 (EEE)", { locale: ko });
export const labelShort = (key: string) => format(fromKey(key), "EEE", { locale: ko });
export const labelMD = (key: string) => format(fromKey(key), "M.d");
export function labelWeek(startKey: string) {
  const end = shiftDays(startKey, 6);
  return `${format(fromKey(startKey), "M월 d일")} – ${format(fromKey(end), "M월 d일")}`;
}
