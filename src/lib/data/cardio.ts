import type { Exercise } from "@/lib/types";

// 유산소·스포츠 — MET 값은 Compendium of Physical Activities 기준 대표값입니다.
// 소모 칼로리 = MET × 체중(kg) × 시간(h) 로 추정합니다.

const c = (
  id: string,
  name: string,
  nameEn: string,
  met: number,
  aliases: string[],
): Exercise => ({ id, name, nameEn, aliases, met, equipment: "cardio", primary: [], secondary: [] });

export const CARDIO: Exercise[] = [
  c("cardio-treadmill-walk", "트레드밀 걷기", "Treadmill Walk", 3.5, ["런닝머신 걷기", "러닝머신 걷기", "트레드밀", "걷기", "워킹"]),
  c("cardio-incline-walk", "인클라인 워킹", "Incline Walk", 6.0, ["경사 걷기", "인클라인", "12-3-30", "언덕 걷기", "incline"]),
  c("cardio-treadmill-run", "트레드밀 러닝", "Treadmill Run", 9.0, ["런닝머신", "러닝머신", "뛰기", "달리기", "런닝"]),
  c("cardio-run", "야외 러닝", "Outdoor Run", 9.8, ["러닝", "달리기", "런닝", "run", "running"]),
  c("cardio-jog", "조깅", "Jogging", 7.0, ["가볍게 달리기", "jog"]),
  c("cardio-walk", "걷기 (야외)", "Walk", 3.5, ["산책", "걷기", "만보", "walk"]),
  c("cardio-cycle-indoor", "실내 사이클", "Stationary Bike", 7.0, ["자전거", "바이크", "싸이클", "사이클", "실내자전거"]),
  c("cardio-spin", "스피닝", "Spin Bike", 8.5, ["스핀바이크", "스핀", "spinning"]),
  c("cardio-cycle-outdoor", "자전거 (야외)", "Cycling", 7.5, ["라이딩", "자전거", "cycling"]),
  c("cardio-stairmill", "천국의 계단", "Stair Mill", 9.0, ["스텝밀", "천계", "계단", "stairmaster", "stair"]),
  c("cardio-stepper", "스텝퍼", "Stepper", 8.0, ["스테퍼", "stepper"]),
  c("cardio-elliptical", "일립티컬", "Elliptical", 5.0, ["크로스트레이너", "엘립티컬", "elliptical"]),
  c("cardio-rowing", "로잉머신", "Rowing Machine", 7.0, ["로잉", "조정", "rowing", "rower"]),
  c("cardio-air-bike", "에어바이크", "Air Bike", 10.0, ["어설트바이크", "에어 바이크", "assault bike"]),
  c("cardio-jump-rope", "줄넘기", "Jump Rope", 11.0, ["점프로프", "jump rope"]),
  c("cardio-swim", "수영", "Swimming", 7.0, ["자유형", "swim"]),
  c("cardio-hike", "등산", "Hiking", 6.5, ["하이킹", "산행", "hiking"]),
  c("cardio-hiit", "HIIT · 서킷", "HIIT", 8.0, ["인터벌", "서킷", "타바타", "버피", "크로스핏"]),
  c("cardio-boxing", "복싱", "Boxing", 7.8, ["킥복싱", "샌드백", "boxing"]),
  c("cardio-soccer", "축구 · 풋살", "Soccer", 7.0, ["풋살", "축구", "soccer"]),
  c("cardio-basketball", "농구", "Basketball", 6.5, ["basketball"]),
  c("cardio-tennis", "테니스", "Tennis", 7.3, ["tennis"]),
  c("cardio-badminton", "배드민턴", "Badminton", 5.5, ["badminton"]),
  c("cardio-climbing", "클라이밍", "Climbing", 8.0, ["볼더링", "암벽", "climbing"]),
];
