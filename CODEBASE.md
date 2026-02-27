# 시약장관리 — 코드베이스 분석

> 고등학교 과학실 시약 재고 관리 웹 앱
> 배포: https://inven-beryl.vercel.app/

---

## 1. 프로젝트 구조

```
lab-inventory/
├── index.html              # 브라우저 진입점 (타이틀, 뷰포트 설정)
├── vite.config.js          # Vite 빌드 설정
├── vercel.json             # Vercel 배포 설정 (SPA 리다이렉트)
├── package.json            # 의존성 목록
├── .env                    # 환경 변수 (Supabase URL/Key) — git 제외
└── src/
    ├── main.jsx            # React 루트 마운트
    ├── App.jsx             # 앱 전체 코드 (단일 파일 구조)
    ├── supabase.js         # Supabase 클라이언트 초기화 + IS_DEMO 판단
    └── firebase.js         # (미사용)
```

### 의존성

| 패키지 | 버전 | 용도 |
|---|---|---|
| react / react-dom | 18.3 | UI 프레임워크 |
| @supabase/supabase-js | 2.47 | 인증 + PostgreSQL 연동 |
| html5-qrcode | 2.3 | QR/바코드 카메라 스캔 |
| qrcode.react | 4.1 | QR 코드 SVG 생성 |
| vite | 6.0 | 빌드 도구 |

---

## 2. 핵심 설계 원칙

### 단일 파일 컴포넌트 패턴
`src/App.jsx` 한 파일에 모든 컴포넌트, 유틸리티, 상수가 정의되어 있습니다.
약 1,600줄 규모이며, 파일 상단부터 순서대로 구성됩니다.

### IS_DEMO 모드
```js
// src/supabase.js
export const IS_DEMO = import.meta.env.VITE_SUPABASE_URL?.includes("여기에");
```
환경 변수에 실제 URL이 없으면 자동으로 데모 모드로 전환됩니다.
데모 모드에서는 Supabase를 호출하지 않고 로컬 샘플 데이터만 사용합니다.

### 학교별 데이터 격리
- 회원가입 시 입력한 `school_name`이 Supabase `user_metadata`에 저장됩니다.
- 모든 DB 레코드에 `school_id` 컬럼이 포함됩니다.
- Supabase RLS(Row Level Security) 정책이 `auth.jwt() -> 'user_metadata' ->> 'school_name'`과 `school_id`를 비교하여 다른 학교 데이터를 완전히 차단합니다.

---

## 3. 전역 상수 및 데이터

### GHS_PICTOGRAMS
GHS 국제 위험성 기준 9가지 항목을 정의합니다.

```
flammable(인화성) / oxidizer(산화성) / toxic(급성독성) / corrosive(부식성)
irritant(자극성) / health(건강유해) / environment(환경유해) / gas(고압가스) / explosive(폭발성)
```

각 항목은 `{ icon, label, color }` 형태이며, 약품 등록·표시·필터링에 공통으로 사용됩니다.

### SAMPLE_CHEMICALS / SAMPLE_LOGS
데모 모드 전용 샘플 데이터입니다. 고등학교 실험실 약품 10종과 최근 입출고 이력 5건이 포함됩니다.

### CHEMICAL_PRESETS (50+ 종)
약품 등록 시 자동완성에 사용되는 고교 실험실 주요 약품 프리셋입니다.
카테고리별로 구성되어 있으며, 각 항목에 기본 단위와 GHS 위험성 코드가 포함됩니다.

| 카테고리 | 약품 예시 |
|---|---|
| 산 | 염산, 황산, 질산, 아세트산 |
| 염기 | 수산화나트륨, 수산화칼륨, 암모니아수 |
| 유기용매 | 에탄올, 아세톤, 메탄올, 클로로포름 |
| 산화제 | 과산화수소, 과망간산칼륨 |
| 금속염 | 질산은, 황산구리, 염화나트륨 |
| 지시약 | 페놀프탈레인, 메틸오렌지, BTB |
| 기타 | 아이오딘, 포름알데히드, 포도당 |

---

## 4. 유틸리티 함수

### 데이터 변환 (DB ↔ App)

DB는 snake_case, 앱 내부는 camelCase를 사용합니다.
또한 DB의 `grade` 컬럼을 앱에서는 `memo`로 매핑합니다.

```js
chemToApp(row)   // DB 레코드 → 앱 객체
chemToDb(chem)   // 앱 객체 → DB 레코드
logToApp(row)    // DB 로그 레코드 → 앱 객체
```

| DB 컬럼 | 앱 필드 |
|---|---|
| min_stock | minStock |
| msds_url | msdsUrl |
| last_updated | lastUpdated |
| grade | memo |
| user_name | user |
| chemical_id | chemicalId |

### 단위 변환 — getUnitOptions(baseUnit)

| 기준 단위 | 선택 가능 단위 | 변환 계수 |
|---|---|---|
| mL | mL (×1), L (×1000) | |
| g | g (×1), mg (×0.001), kg (×1000) | |
| 기타 | 해당 단위만 | ×1 |

### 재고 상태 — getStockStatus(stock, minStock)

| 조건 | 라벨 | 색상 |
|---|---|---|
| stock ≤ minStock | 부족 | 빨강 |
| stock ≤ minStock × 2 | 주의 | 주황 |
| 그 외 | 충분 | 초록 |

### CSV 유틸리티

- `exportToCSV(chemicals)` — 현재 약품 목록을 UTF-8 BOM CSV로 다운로드
- `parseCSV(text)` — CSV 텍스트를 2차원 배열로 파싱 (따옴표 처리 포함)
- `parseCSVLine(line)` — 한 줄 파싱 (따옴표 내 쉼표 처리)
- `downloadCSVTemplate()` — 가져오기용 빈 템플릿 CSV 다운로드

CSV 열 순서: `약품명, 분류, 단위, 현재재고, 보관위치, 메모, 공급처, 위험성코드`

---

## 5. 컴포넌트 구조

```
LabInventoryApp (메인)
├── LoadingScreen          — 인증 확인 중 표시
├── LoginScreen            — 로그인 / 회원가입 / 비밀번호 재설정
├── SetupWizard            — 최초 DB 구축 (샘플/CSV/빈 목록)
│   └── CSV 미리보기 화면
├── Header                 — 상단 고정 헤더 (타이틀, MSDS, 스캔, 추가, 로그아웃)
├── renderDashboard()      — 대시보드 탭
├── renderInventory()      — 약품 목록 탭
├── renderDetail()         — 약품 상세 화면
├── renderLogForm()        — 입출고 등록 폼 (바텀시트)
├── BottomNav              — 하단 탭 네비게이션
└── [모달들]
    ├── AddChemicalModal   — 새 약품 등록
    ├── EditLogModal       — 이력 수정 / 삭제
    ├── QRScanner          — QR/바코드 카메라 스캔
    └── QRCodeModal        — QR 코드 생성 및 PNG 저장
```

---

## 6. 컴포넌트 상세

### LoginScreen

세 가지 모드를 하나의 컴포넌트에서 처리합니다.

| 모드 | 설명 |
|---|---|
| signin | 이메일 + 비밀번호 로그인 |
| signup | 학교명 + 이메일 + 비밀번호 + 확인 회원가입 |
| reset | 비밀번호 재설정 이메일 발송 |

- 회원가입 시 `school_name`을 Supabase `user_metadata`에 저장
- 비밀번호 확인 불일치 시 실시간 빨간 테두리 표시
- 학교명 입력 힌트: `예: 오산고등학교(서울)` 형식 안내

### SetupWizard

DB에 약품이 0개일 때 자동 표시되는 초기 설정 화면입니다.

| 옵션 | 동작 |
|---|---|
| 샘플 데이터로 시작 | 10종 약품 + 5건 이력 일괄 삽입 |
| CSV 파일 가져오기 | 파일 선택 → 미리보기 → 일괄 삽입 |
| 빈 목록으로 시작 | 바로 앱 진입 |

### AddChemicalModal

약품 등록 폼입니다.

- **분류 칩 버튼**: 산 / 염기 / 무기 / 유기 / 지시약 빠른 선택 + 직접 입력
- **약품명 자동완성**: 기등록 약품(중복 경고) + 프리셋 동시 검색
- **GHS 위험성**: 토글 버튼으로 다중 선택
- **코드 자동 배정**: 기존 최대 번호 + 1 (`C001`, `C002`, ...)

### EditLogModal

이력 수정 모달입니다.

- 입고/출고 유형 변경, 수량 + 단위 변환, 담당자/용도/비고 수정
- **삭제** 버튼: 2단계 확인(빨간 패널) 후 이력 삭제 + 재고 자동 되돌리기
- 수정/삭제 모두 재고(`chemicals.stock`)를 즉시 재계산

### QRScanner

`html5-qrcode` 라이브러리로 카메라를 열어 QR코드를 스캔합니다.

- 스캔 성공 시 해당 약품 상세 화면으로 이동
- 카메라 권한 거부 시 데모 버튼(약품 목록 4개)으로 대체

### QRCodeModal

`qrcode.react`로 약품 ID를 QR코드 SVG로 생성합니다.

- PNG 다운로드: SVG → Canvas → PNG 변환 (약품명, ID, 위치 텍스트 포함)

---

## 7. 메인 앱 (LabInventoryApp) 상태 관리

### 주요 상태값

| 상태 | 타입 | 설명 |
|---|---|---|
| user | object \| null | Supabase 인증 사용자 |
| chemicals | array | 약품 목록 |
| logs | array | 입출고 이력 |
| activeTab | string | dashboard / inventory / detail |
| selectedChemical | object \| null | 상세 보기 중인 약품 |
| filterCategory | string | 목록 카테고리 필터 |
| searchQuery | string | 검색어 |
| showSetup | bool | SetupWizard 표시 여부 |
| showEditLog | bool | EditLogModal 표시 여부 |
| editingLog | object \| null | 수정 중인 이력 |

### 데이터 흐름

```
Supabase
  └─ fetchChemicals() → chemicals 상태
  └─ fetchLogs()      → logs 상태
  └─ Realtime 구독    → chemicals/logs 변경 시 자동 갱신

사용자 액션
  └─ 입출고 제출  → logs INSERT + chemicals UPDATE
  └─ 약품 등록   → chemicals INSERT
  └─ 이력 수정   → logs UPDATE + chemicals UPDATE
  └─ 이력 삭제   → logs DELETE + chemicals 재고 복원
```

### 핵심 핸들러

| 함수 | 역할 |
|---|---|
| `handleLogSubmit` | 입출고 처리. 단위 변환 후 재고 증감 |
| `handleEditLog` | 이력 수정. 이전/새 효과 차이(delta)로 재고 재계산 |
| `handleDeleteLog` | 이력 삭제. 삭제된 이력의 재고 효과를 역방향으로 복원 |
| `handleAddChemical` | 새 약품 등록. 코드 자동 배정 |
| `handleScan` | QR 스캔 후 약품 검색 → 상세 화면 이동 |

### 재고 복원 로직 (handleDeleteLog)

```js
// 입고 이력 삭제 → 재고를 입고량만큼 감소
// 출고 이력 삭제 → 재고를 출고량만큼 증가
const revertDelta = log.type === "in" ? -log.amount : log.amount;
const newStock = Math.max(0, chem.stock + revertDelta);
```

---

## 8. Supabase 데이터베이스 구조

### chemicals 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | TEXT PK | 약품 코드 (C001, C002...) |
| name | TEXT | 약품명 |
| category | TEXT | 분류 |
| unit | TEXT | 기준 단위 (mL, g 등) |
| stock | NUMERIC | 현재 재고 |
| min_stock | NUMERIC | 최소 재고 기준 |
| location | TEXT | 보관 위치 |
| hazards | TEXT[] | GHS 위험성 코드 배열 |
| msds_url | TEXT | MSDS 링크 |
| grade | TEXT | 메모 (앱에서는 memo로 표시) |
| supplier | TEXT | 공급처 |
| last_updated | DATE | 최종 수정일 |
| school_id | TEXT | 학교 식별자 (데이터 격리 키) |

### logs 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID PK | 자동 생성 |
| chemical_id | TEXT | 약품 코드 |
| type | TEXT | 'in' 또는 'out' |
| amount | NUMERIC | 수량 (기준 단위 기준) |
| user_name | TEXT | 담당자 |
| purpose | TEXT | 용도/사유 |
| note | TEXT | 비고 |
| date | TIMESTAMPTZ | 처리 시각 |
| school_id | TEXT | 학교 식별자 |

### RLS 정책

```sql
-- 예시: 조회 정책
USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_name'))
```

INSERT / UPDATE / DELETE / SELECT 모두 동일 조건 적용.
같은 학교명으로 가입한 계정끼리만 데이터를 공유합니다.

---

## 9. 화면 구성

### 헤더 (상단 고정)
```
[🧪 시약장관리]  [학교명]    [📷] [➕] [MSDS] [→로그아웃]
```

### 대시보드 탭
- 통계 카드: 전체 약품 수 / 오늘 입출고 건수 / 위험물(독성+부식성) 수
- 최근 입출고 이력 목록 (✏️ 수정 버튼 포함)

### 약품목록 탭
- 카테고리 칩 필터 + 검색 + 엑셀 저장 버튼
- 약품 카드: 이름, 코드, 재고, 단위, GHS 아이콘, 재고 상태 배지

### 약품 상세 화면
- 재고 현황, GHS 위험성 목록
- 메타 정보 그리드: 분류, 메모, 보관위치, 공급처, 코드, 최종수정
- 출고 / 입고 / QR코드 버튼

### 하단 네비게이션
```
[📊 대시보드]  [🧪 약품목록]  [📷 스캔]
```

### 플로팅 버튼
화면 우하단 고정, 클릭 시 입출고 폼 열림

---

## 10. 환경 변수

```env
VITE_SUPABASE_URL=https://[프로젝트ID].supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SCHOOL_NAME=과학실험실   # (선택) 로그인 화면 부제목
```

`.env` 파일은 `.gitignore`에 포함되어야 합니다.
Vercel 배포 시 프로젝트 설정 > Environment Variables에 동일하게 입력합니다.

---

## 11. 배포 절차

```bash
# 로컬 개발
npm run dev

# 빌드 테스트
npm run build

# GitHub 업로드 (최초)
git init
git add .
git commit -m "초기 커밋"
git branch -M main
git remote add origin https://github.com/[계정]/[레포].git
git push -u origin main

# 이후 업데이트
git add .
git commit -m "변경 내용"
git push

# Vercel: GitHub 연동 후 자동 배포
```

---

## 12. 알려진 구조적 특이사항

1. **grade 컬럼 재사용** — DB의 `grade` 컬럼을 앱에서 `memo`로 표시. DB 스키마 변경 없이 용도만 변경된 상태.
2. **msdsUrl 필드 잔존** — 약품 객체에 `msdsUrl` 필드가 남아 있지만, UI에서는 더 이상 개별 링크를 표시하지 않음. 헤더의 MSDS 버튼이 공통 KOSHA 검색 페이지로 연결.
3. **단일 파일 구조** — 유지보수성보다 단순성을 우선한 설계. 기능 추가 시 파일 분리를 고려할 수 있음.
4. **Realtime 구독** — `chemicals`, `logs` 테이블 변경 사항을 실시간으로 감지하여 같은 학교의 여러 교사가 동시에 사용 시 자동 갱신됨.
