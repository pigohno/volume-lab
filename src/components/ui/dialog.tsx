"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * 모바일 키보드 대응 — iOS Safari는 키보드가 올라와도 화면 높이가 그대로라서
 * 바텀시트가 키보드 뒤에 숨습니다. 실제로 보이는 영역(visualViewport)에 맞춰 시트를 올려 줍니다.
 */
function useKeyboardInset(enabled: boolean) {
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  React.useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!enabled || !vv) return;
    const mobile = window.matchMedia("(max-width: 639px)");
    const update = () => {
      if (!mobile.matches) return setStyle({});
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setStyle(inset > 0 ? { bottom: inset, maxHeight: vv.height - 12 } : {});
      // 키보드가 올라오면 입력 중인 칸이 보이도록
      const el = document.activeElement as HTMLElement | null;
      if (inset > 0 && el?.matches("input, textarea")) el.scrollIntoView({ block: "nearest" });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return style;
}

/** 시트 하단에 붙어 있는 버튼 영역 — 내용이 길거나 키보드가 올라와도 항상 보입니다. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("sticky bottom-0 z-10 -mx-5 mt-4 flex gap-2 border-t border-border bg-popover px-5 pt-3 pb-1", className)}
      {...props}
    />
  );
}

/** 모바일에서는 바텀시트, 데스크톱에서는 가운데 모달로 뜹니다. */
export function DialogContent({
  className,
  children,
  title,
  description,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  const kb = useKeyboardInset(true);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[88dvh] w-full flex-col border border-border bg-popover shadow-2xl outline-none",
          "inset-x-0 bottom-0 rounded-t-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
        style={{ ...style, ...kb }}
        {...props}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">닫기</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 safe-bottom">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
