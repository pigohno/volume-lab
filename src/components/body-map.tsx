"use client";

import type { KeyboardEvent } from "react";
import type { MuscleId } from "@/lib/types";
import { MUSCLE_LABEL } from "@/lib/muscles";

/*
 * 앞/뒤 근육 맵.
 * 모든 좌표는 figure 왼쪽 절반(x < 100)만 정의하고, 오른쪽은 x=100 기준으로
 * 미러링(matrix(-1 0 0 1 200 0))해서 좌우 대칭을 보장합니다.
 * viewBox 0 0 200 440, 약 8등신 비율.
 */

const MIRROR = "matrix(-1 0 0 1 200 0)";

type Region = { id: MuscleId; d: string[] };

/* ───────────── 실루엣 (근육 아닌 부분) ───────────── */

const HEAD = "M100 8 C111 8 118 17 118 31 C118 45 111 57 100 57 C89 57 82 45 82 31 C82 17 89 8 100 8 Z";
const NECK = "M91 50 L109 50 L110 68 L90 68 Z";

const BASE_HALF: string[] = [
  // 몸통
  "M100 62 L91 63 L89 72 C80 76 66 76 58 79 C50 82 46 90 47 100 L62 108 C64 128 68 150 70 170 C68 186 63 198 62 214 L64 228 C76 232 90 235 100 236 Z",
  // 팔 (상완 + 전완)
  "M56 80 C46 84 41 96 40 116 C39 138 38 154 38 168 C35 186 32 206 33 226 L47 226 C49 206 54 188 56 170 C58 150 61 128 61 108 C61 96 60 86 56 80 Z",
  // 손
  "M33 224 C30 236 29 250 33 261 C36 266 43 265 45 258 C48 248 49 236 47 224 Z",
  // 다리
  "M62 212 C57 240 58 270 64 300 C67 314 70 326 69 336 C66 356 70 384 78 406 L92 406 C94 386 96 362 96 342 C96 326 95 314 96 300 C98 276 100 252 100 236 Z",
  // 발
  "M78 404 C76 414 74 424 77 431 C82 434 90 434 94 431 C95 422 94 412 92 404 Z",
];

/* ───────────── 공통 근육 ───────────── */

const SIDE_DELT = "M58 79 C50 81 44 88 43 100 C43 112 46 120 50 126 C49 112 50 95 56 82 Z";
const FOREARM = "M39 171 C36 188 33 206 34 222 L46 222 C49 206 54 189 56 173 C50 168 44 168 39 171 Z";

/* ───────────── 앞면 ───────────── */

const FRONT: Region[] = [
  { id: "side_delt", d: [SIDE_DELT] },
  {
    id: "front_delt",
    d: ["M58 79 C64 80 67 86 66 96 C62 108 56 118 50 126 C49 112 50 95 56 82 Z"],
  },
  {
    id: "chest",
    d: ["M98 84 L98 124 C92 130 80 131 71 127 C66 123 62 117 60 111 C64 101 67 92 68 84 C78 81 90 81 98 84 Z"],
  },
  {
    id: "biceps",
    d: ["M51 121 C45 128 42 140 42 152 C42 160 44 165 48 166 C52 165 56 160 57 150 C58 138 58 125 57 115 C55 117 53 119 51 121 Z"],
  },
  { id: "forearms", d: [FOREARM] },
  {
    id: "abs",
    d: ["M98 133 L98 202 C93 206 87 206 82 201 C80 181 79 156 80 135 C86 132 92 132 98 133 Z"],
  },
  {
    id: "obliques",
    d: ["M78 135 C73 133 69 131 65 129 C67 146 71 160 71 172 C69 184 67 194 67 204 C72 205 77 204 80 202 C78 182 77 157 78 135 Z"],
  },
  {
    id: "quads",
    d: ["M64 221 C59 246 60 274 66 300 C70 310 77 315 85 315 C91 313 94 306 94 296 C92 271 89 253 84 235 C78 229 70 224 64 221 Z"],
  },
  {
    id: "adductors",
    d: ["M86 236 C91 239 96 240 99 239 C99 257 97 277 95 294 C93 272 90 254 86 236 Z"],
  },
  {
    id: "calves",
    d: [
      "M69 338 C63 354 65 378 72 398 L79 398 C78 378 79 358 81 342 C77 338 73 337 69 338 Z",
      "M89 341 C95 350 97 366 95 380 C93 385 91 388 89 390 C87 374 86 357 89 341 Z",
    ],
  },
];

// 복근 마디 등 장식선 (클릭 대상 아님)
const FRONT_DETAIL_HALF = ["M81 152 C87 151 93 151 98 152", "M80.5 170 C87 169 93 169 98 170", "M81 187 C87 186 93 186 98 187"];

/* ───────────── 뒷면 ───────────── */

const BACK: Region[] = [
  {
    id: "upper_back",
    d: ["M99 62 L99 148 C94 139 88 126 81 113 C75 103 70 93 64 84 C74 80 83 76 90 66 Z"],
  },
  { id: "side_delt", d: [SIDE_DELT] },
  {
    id: "rear_delt",
    d: ["M60 80 C65 82 67 88 66 96 C62 108 56 118 50 126 C49 112 50 95 56 82 Z"],
  },
  {
    id: "lats",
    d: ["M64 106 C62 128 66 150 70 176 C76 186 84 192 90 194 C90 180 91 168 93 158 C88 146 84 131 79 117 C75 111 70 107 64 106 Z"],
  },
  {
    id: "lower_back",
    d: ["M99 153 L99 212 C95 212 91 210 89 206 C89 189 90 172 93 159 C95 155 97 153 99 153 Z"],
  },
  {
    id: "triceps",
    d: ["M52 116 C46 121 41 133 40 146 C40 156 42 164 46 168 L54 168 C57 160 59 148 59 136 C59 126 58 118 56 112 Z"],
  },
  { id: "forearms", d: [FOREARM] },
  {
    id: "glutes",
    d: ["M98 216 C88 211 74 211 66 217 C60 227 59 242 64 252 C72 262 88 264 98 258 Z"],
  },
  {
    id: "hamstrings",
    d: ["M64 259 C62 279 64 297 70 314 C76 320 84 320 92 316 C95 300 97 281 97 265 C88 267 74 266 64 259 Z"],
  },
  {
    id: "calves",
    d: [
      "M70 336 C64 350 64 372 72 388 C76 392 81 392 83 387 L83 340 C80 335 74 333 70 336 Z",
      "M86 340 C91 337 96 343 96 356 C96 370 94 382 88 388 L86 386 Z",
    ],
  },
];

// 햄스트링 이두/반건양근 분리선
const BACK_DETAIL_HALF = ["M81 266 C81 282 81 298 81 318"];

/* ───────────── 컴포넌트 ───────────── */

type BodyMapProps = {
  values: Partial<Record<MuscleId, number>>;
  onSelect?: (m: MuscleId) => void;
  selected?: MuscleId | null;
  className?: string;
};

function intensityOf(values: BodyMapProps["values"], id: MuscleId) {
  const v = values[id] ?? 0;
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function fillFor(v: number) {
  if (v <= 0) return "var(--map-muscle)";
  const pct = Math.round(25 + 75 * v);
  return `color-mix(in oklab, var(--map-heat) ${pct}%, var(--map-muscle))`;
}

function Figure({
  regions,
  details,
  label,
  values,
  onSelect,
  selected,
}: {
  regions: Region[];
  details: string[];
  label: string;
} & Omit<BodyMapProps, "className">) {
  const interactive = typeof onSelect === "function";

  return (
    <figure className="flex min-w-0 max-w-[220px] flex-1 flex-col items-center gap-2">
      <svg
        viewBox="0 0 200 440"
        className="h-auto max-h-[440px] w-full"
        role="img"
        aria-label={`근육 맵 ${label}`}
      >
        {/* 실루엣 */}
        <g fill="var(--map-base)" stroke="var(--map-stroke)" strokeWidth={0.75} strokeLinejoin="round">
          <path d={NECK} />
          <path d={HEAD} />
          {BASE_HALF.map((d, i) => (
            <path key={`l${i}`} d={d} />
          ))}
          {BASE_HALF.map((d, i) => (
            <path key={`r${i}`} d={d} transform={MIRROR} />
          ))}
          {/* 좌우 절반이 맞닿는 중심선 이음매 가리기 */}
          <rect x={99.4} y={63.5} width={1.2} height={186} stroke="none" />
        </g>

        {/* 근육 */}
        {regions.map((r) => {
          const v = intensityOf(values, r.id);
          const isSelected = selected === r.id;
          const title = `${MUSCLE_LABEL[r.id]} ${Math.round(v * 100)}%`;
          const pathStyle = {
            fill: fillFor(v),
            stroke: isSelected ? "var(--map-heat)" : "var(--map-stroke)",
            strokeWidth: isSelected ? 1.5 : 0.75,
            transition: "fill 300ms, stroke 300ms",
          };
          const onKeyDown = interactive
            ? (e: KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.id);
                }
              }
            : undefined;

          return (
            <g
              key={r.id}
              strokeLinejoin="round"
              className={
                interactive
                  ? "cursor-pointer outline-none [&:focus-visible_path]:[stroke:var(--map-heat)] [&:hover_path]:brightness-125"
                  : undefined
              }
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? title : undefined}
              aria-pressed={interactive ? isSelected : undefined}
              onClick={interactive ? () => onSelect(r.id) : undefined}
              onKeyDown={onKeyDown}
            >
              <title>{title}</title>
              {r.d.map((d, i) => (
                <path key={`l${i}`} d={d} style={pathStyle} />
              ))}
              {r.d.map((d, i) => (
                <path key={`r${i}`} d={d} transform={MIRROR} style={pathStyle} />
              ))}
            </g>
          );
        })}

        {/* 장식선 */}
        <g fill="none" stroke="var(--map-stroke)" strokeWidth={0.75} strokeLinecap="round" pointerEvents="none">
          {details.map((d, i) => (
            <path key={`l${i}`} d={d} />
          ))}
          {details.map((d, i) => (
            <path key={`r${i}`} d={d} transform={MIRROR} />
          ))}
        </g>
      </svg>
      <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function BodyMap({ values, onSelect, selected = null, className }: BodyMapProps) {
  return (
    <div className={["flex w-full items-start justify-center gap-4", className].filter(Boolean).join(" ")}>
      <Figure regions={FRONT} details={FRONT_DETAIL_HALF} label="앞" values={values} onSelect={onSelect} selected={selected} />
      <Figure regions={BACK} details={BACK_DETAIL_HALF} label="뒤" values={values} onSelect={onSelect} selected={selected} />
    </div>
  );
}
