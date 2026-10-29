import { Suspense } from "react";
import type { Metadata } from "next";
import { ShareView } from "@/components/share-view";

export const metadata: Metadata = { title: "공유된 기록" };

export default function SharePage({ params }: PageProps<"/s/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">불러오는 중…</div>}>
      <ShareView params={params} />
    </Suspense>
  );
}
