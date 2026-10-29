"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, LineChart, Salad, Scale, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store/provider";
import { LoginScreen } from "./login-screen";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/workout", label: "운동", icon: Dumbbell },
  { href: "/volume", label: "볼륨", icon: LineChart },
  { href: "/diet", label: "식단", icon: Salad },
  { href: "/inbody", label: "인바디", icon: Scale },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, session, authChecked, ready } = useStore();
  // 기록은 전부 브라우저(또는 로그인 후 Supabase)에서 오기 때문에, 화면 본문은 클라이언트에서만 그립니다.
  // 헤더·탭은 서버에서 미리 그려져서 첫 화면이 바로 뜹니다.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  if (mode === "supabase" && authChecked && !session) return <LoginScreen />;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="flex h-12 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Logo />
            Volume Lab
          </Link>
          {mode === "local" && (
            <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
              데모 모드
            </span>
          )}
          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                  isActive(n.href) && "bg-accent text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/settings"
            aria-label="설정"
            className={cn(
              "rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:ml-1",
              "ml-auto sm:ml-1",
              pathname.startsWith("/settings") && "bg-accent text-foreground",
            )}
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5 sm:pb-12">{mounted && (ready || mode === "local") ? children : <Skeleton />}</main>

      {/* 모바일 하단 탭 — Capacitor 앱으로 감쌌을 때도 그대로 씁니다 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 pt-1.5 safe-bottom">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 text-[10px] text-muted-foreground transition-colors",
                  active && "text-foreground",
                )}
              >
                <n.icon className={cn("size-5", active && "text-primary")} strokeWidth={active ? 2.2 : 1.8} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <defs>
        <linearGradient id="vl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b93f0" />
          <stop offset="1" stopColor="#5e6ad2" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#vl-g)" />
      <path d="M7 15.5V12M10.3 15.5V9.5M13.7 15.5V7.5M17 15.5V10.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const noop = () => () => {};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-7 w-40 rounded-md bg-muted" />
      <div className="h-24 rounded-xl bg-card" />
      <div className="h-40 rounded-xl bg-card" />
    </div>
  );
}
