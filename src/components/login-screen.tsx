"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "./app-shell";

/**
 * 이메일 OTP 로그인 — 메일의 링크를 눌러도 되고, 6자리 코드를 입력해도 됩니다.
 * 코드 방식은 Capacitor 앱에서 딥링크 설정 없이 바로 쓸 수 있어서 함께 열어 두었습니다.
 */
export function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("메일을 보냈어요. 링크를 누르거나 코드를 입력해 주세요.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) toast.error("코드가 맞지 않거나 만료됐어요.");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Logo className="size-10" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Volume Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">이메일로 로그인하면 어느 기기에서든 기록이 이어져요.</p>

        {!sent ? (
          <form onSubmit={send} className="mt-8 space-y-3">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Mail />}
              로그인 메일 받기
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-8 space-y-3">
            <p className="text-[13px] text-muted-foreground">
              <span className="text-foreground">{email}</span>로 보낸 메일의 6자리 코드를 입력해 주세요.
            </p>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 text-center text-lg tracking-[0.4em] num"
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy || code.trim().length < 6}>
              {busy && <Loader2 className="animate-spin" />}
              확인
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setSent(false)}>
              이메일 다시 입력
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
