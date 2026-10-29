// 한글 검색 도우미 — 초성 검색("ㅂㅊㅍ" → 벤치프레스), 띄어쓰기 무시, 부분 일치 점수화
const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export function normalize(s: string) {
  return s.toLowerCase().replace(/[\s·\-_()[\]/.,]/g, "");
}

export function toChosung(s: string) {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) out += CHO[Math.floor(code / 588)];
    else out += ch;
  }
  return out;
}

const isChosungOnly = (s: string) => /^[ㄱ-ㅎ]+$/.test(s);

/** 0이면 불일치, 클수록 더 잘 맞음 */
export function scoreText(query: string, targets: string[]): number {
  const q = normalize(query);
  if (!q) return 1;
  let best = 0;
  for (const raw of targets) {
    const t = normalize(raw);
    if (!t) continue;
    if (t === q) best = Math.max(best, 100);
    else if (t.startsWith(q)) best = Math.max(best, 80 - Math.min(20, t.length - q.length));
    else if (t.includes(q)) best = Math.max(best, 60 - Math.min(20, t.indexOf(q)));
    else if (isChosungOnly(q)) {
      const c = toChosung(t);
      if (c.startsWith(q)) best = Math.max(best, 50);
      else if (c.includes(q)) best = Math.max(best, 35);
    } else if (subsequence(q, t)) best = Math.max(best, 15);
  }
  return best;
}

function subsequence(q: string, t: string) {
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length && q.length >= 2;
}

/** 공백으로 나눈 모든 토큰이 맞아야 통과 ("인클 덤벨" 같은 검색) */
export function multiTokenScore(query: string, targets: string[]) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return scoreText(query, targets);
  let sum = 0;
  for (const tk of tokens) {
    const s = scoreText(tk, targets);
    if (!s) return 0;
    sum += s;
  }
  return sum / tokens.length + scoreText(query, targets) * 0.2;
}
