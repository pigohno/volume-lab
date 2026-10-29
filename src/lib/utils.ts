import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
