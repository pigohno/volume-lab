import type { SharePayload } from "@/lib/types";

// 로컬 모드 공유: DB 없이 링크 자체에 데이터를 담습니다. ("l." 접두사)
export function encodeShare(p: SharePayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return "l." + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(id: string): SharePayload | null {
  try {
    const b64 = id.slice(2).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharePayload;
  } catch {
    return null;
  }
}
