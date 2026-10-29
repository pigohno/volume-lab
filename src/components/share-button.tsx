"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Share2 } from "lucide-react";
import type { ShareKind } from "@/lib/types";
import { useStore } from "@/lib/store/provider";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * 공유 링크를 만들어 기기 공유 시트(모바일) 또는 클립보드(데스크톱)로 보냅니다.
 * 데모 모드에서는 데이터가 링크 안에 담기고, Supabase 모드에서는 짧은 링크가 생성됩니다.
 */
export function ShareButton({
  kind,
  title,
  data,
  label = "공유",
  disabled,
  ...rest
}: { kind: ShareKind; title: string; data: unknown; label?: string } & Omit<ButtonProps, "onClick">) {
  const { createShare } = useStore();
  const [busy, setBusy] = React.useState(false);

  async function share() {
    setBusy(true);
    try {
      const id = await createShare({ kind, title, data, createdAt: new Date().toISOString() });
      const url = `${window.location.origin}/s/${id}`;
      if (navigator.share) {
        await navigator.share({ title: `Volume Lab · ${title}`, url }).catch(() => undefined);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("공유 링크를 복사했어요");
      }
    } catch (e) {
      toast.error(`공유 링크를 만들지 못했어요: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={share} disabled={busy || disabled} {...rest}>
      {busy ? <Loader2 className="animate-spin" /> : <Share2 />}
      {label}
    </Button>
  );
}
