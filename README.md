# Volume Lab

볼륨을 키워 나가는 운동 기록 + 단백질 중심 식단 + 인바디 추적 웹앱입니다.
Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui 스타일 컴포넌트 · Supabase

디자인 레퍼런스는 **Linear**입니다. 거의 검정에 가까운 배경, 얇은 보더, 절제된 인디고 포인트를 씁니다.

## 기능 (v0.1)

| 영역 | 내용 |
| --- | --- |
| 운동 | 운동 찾기(줄임말 `벤프`·`랫풀`, 초성 `ㅂㅊㅍ`, 부위 검색), 지난 기록 자동 복사, 점진적 과부하 힌트, 자극 부위 체크, 지난 루틴 불러오기 |
| 기록 찾기 | 내가 했던 운동을 검색해서 날짜별 세트·볼륨·추정 1RM 추이 확인 |
| 주간 볼륨 | 요일별 볼륨(지난주 점선 비교), 부위별 주간 세트 vs 목표, 자극 부위 맵 |
| 식단 | 상품명·브랜드 검색, **단백질 g 근처 상품 찾기**, "남은 단백질 채우기", 칼로리 대비 단백질 정렬, 포장지 보고 직접 등록, 어제 식단 불러오기 |
| 판정 | 체중 × g/kg 목표 대비 단백질·탄수·지방·칼로리 충족/부족/초과 |
| 인바디 | 체중·골격근량·체지방 기록과 추이 그래프 |
| 공유 | 볼륨(자극 부위 맵), 식단(충족 판정), 인바디(기본: 몸무게만) 링크 공유 + 이미지 저장 |

## 실행 모드

- **데모 모드**: Supabase 환경변수가 없으면 기록이 브라우저(localStorage)에만 저장됩니다. 공유 링크는 데이터를 링크에 직접 담습니다.
- **Supabase 모드**: 환경변수를 넣으면 이메일 OTP 로그인과 기기 간 동기화가 켜지고, 공유 링크가 짧아집니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값은 비워둬도 데모 모드로 실행됩니다
npm run dev
```

## Supabase 설정

1. 기존 Supabase 프로젝트를 다른 앱과 함께 씁니다. 테이블은 전부 `vl_` 접두사라 기존 테이블과 겹치지 않아요.
   (로그인 계정(auth.users)은 두 앱이 공유합니다.)
2. SQL Editor에 `supabase/schema.sql` 전체를 붙여넣고 Run
3. Project Settings → API에서 `Project URL`, `anon public` 키를 환경변수에 입력
4. Authentication → URL Configuration
   - Site URL은 기존 앱 것을 그대로 두세요 (바꾸면 기존 앱 로그인 메일이 이쪽으로 옵니다)
   - Redirect URLs에 `https://<volume-lab 배포주소>/**`와 `http://localhost:3000/**`를 **추가**
5. (선택) Authentication → Email Templates → Magic Link 본문에 `{{ .Token }}`을 추가하면
   메일에 6자리 코드도 같이 와서, 링크 대신 코드로 로그인할 수 있습니다. (앱 전환 시 편해요)

## 식약처 식품영양성분 DB 연결 (선택)

1. data.go.kr에서 **식품의약품안전처_식품영양성분DB정보** 활용 신청
2. 마이페이지의 일반 인증키(**Decoding**)를 `MFDS_API_KEY`에 입력
3. 키는 서버 라우트(`/api/foods`)에서만 쓰이고 브라우저에는 노출되지 않습니다.

키가 없으면 내장 기본 상품(닭가슴살·프로틴·유제품·편의점 등)에서만 검색합니다.
기본 상품 영양값은 참고치이므로, 정확한 값은 포장지 기준 "직접 등록"을 권장합니다.

## Vercel 배포

1. vercel.com → Add New → Project → GitHub의 `volume-lab` 저장소 Import
2. Framework는 Next.js로 자동 인식됩니다. 설정은 그대로 두세요.
3. Environment Variables에 `.env.example`의 세 값을 입력 (없으면 데모 모드)
4. Deploy → 이후 `main`에 푸시할 때마다 자동 배포

## 앱으로 전환 (Capacitor)

이 앱은 API 라우트(`/api/foods`)를 쓰기 때문에, Capacitor에서는 **배포된 Vercel 주소를 그대로 띄우는 방식**이 가장 간단합니다.

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Volume Lab" com.volumelab.app --web-dir public
```

`capacitor.config.ts`에 다음을 추가합니다.

```ts
server: { url: "https://<배포주소>", cleartext: false }
```

이후 `npx cap add ios`, `npx cap add android`, `npx cap open ios`로 빌드합니다.
하단 탭, safe-area 여백, 이메일 코드 로그인은 앱 환경을 고려해 미리 맞춰 두었습니다.

## 폴더 구조

```
src/
  app/(app)/        홈·운동·볼륨·식단·인바디·설정 화면
  app/s/[id]/       공유 페이지 (로그인 없이 열람)
  app/api/foods/    식약처 DB 검색 프록시
  components/       화면 컴포넌트, ui/ (shadcn 스타일)
  lib/              타입, 계산(볼륨·판정), 검색(초성), 저장소(local/supabase)
  lib/data/         운동 카탈로그, 기본 식품 데이터
supabase/schema.sql 테이블 + RLS
```

## 다음 단계

- 종이 기록 사진 → 볼륨 데이터 파싱 (AI 비전 API)
- 인바디 연동 (LookinBody 파트너 API)
- 루틴 템플릿, 휴식 타이머
