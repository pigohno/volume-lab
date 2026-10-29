import type { MuscleId } from "./types";

export const MUSCLES: { id: MuscleId; label: string; group: string }[] = [
  { id: "chest", label: "가슴", group: "상체 앞" },
  { id: "front_delt", label: "전면 어깨", group: "어깨" },
  { id: "side_delt", label: "측면 어깨", group: "어깨" },
  { id: "rear_delt", label: "후면 어깨", group: "어깨" },
  { id: "lats", label: "광배", group: "등" },
  { id: "upper_back", label: "등 상부·승모", group: "등" },
  { id: "lower_back", label: "척추기립근", group: "등" },
  { id: "biceps", label: "이두", group: "팔" },
  { id: "triceps", label: "삼두", group: "팔" },
  { id: "forearms", label: "전완", group: "팔" },
  { id: "abs", label: "복근", group: "코어" },
  { id: "obliques", label: "옆구리", group: "코어" },
  { id: "glutes", label: "둔근", group: "하체" },
  { id: "quads", label: "대퇴사두", group: "하체" },
  { id: "hamstrings", label: "햄스트링", group: "하체" },
  { id: "adductors", label: "내전근", group: "하체" },
  { id: "calves", label: "종아리", group: "하체" },
];

export const MUSCLE_LABEL: Record<MuscleId, string> = Object.fromEntries(
  MUSCLES.map((m) => [m.id, m.label]),
) as Record<MuscleId, string>;
