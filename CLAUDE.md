# CLAUDE.md — 시약장 관리 앱

## 프로젝트 개요

고등학교 과학실 시약장 관리 React 앱. Google Sheets + Apps Script를 백엔드로 사용.
각 학교가 자신의 Google Drive에 독립적으로 데이터를 보유 (개발자 중앙 관리 없음).

## 기술 스택

- **프론트엔드**: React 18 + Vite (`src/App.jsx` 화면, `src/domain/inventory.js` 재고 도메인 규칙)
- **백엔드**: Google Apps Script Web App (`public/gsheets-backend.gs`)
- **데이터 레이어**: `src/gsheets.js` (Apps Script fetch 래퍼)
- **스타일**: JSX 인라인 `styles` 상수 (CSS 파일 없음)
- **배포**: Vercel + 학교별 ZIP 패키징 (`scripts/`)

## 아키텍처

```
브라우저 (React)
  └── src/gsheets.js       ← fetch 래퍼, localStorage['gsheetsUrl'] 사용
        └── Apps Script Web App (교사 Google Drive 배포)
              └── Google Sheets (4개 탭)
                    ├── chemicals
                    ├── logs
                    ├── experiments
                    └── experiment_chemicals
```

**Demo 모드**: `localStorage['gsheetsUrl']`이 비어있으면 자동 활성화. `SAMPLE_CHEMICALS` 인메모리 데이터 사용.

## 주요 파일

| 파일 | 역할 |
|---|---|
| `src/App.jsx` | 화면 컴포넌트, 앱 상태, UI 이벤트 처리 |
| `src/domain/inventory.js` | 약품·로그 정규화, 단위 변환, 재고 출납 규칙 |
| `src/gsheets.js` | Apps Script API 호출 레이어 |
| `src/experimentPresets.js` | 고등학교 실험 프리셋 51개 |
| `public/gsheets-backend.gs` | 교사용 Apps Script 백엔드 코드 |
| `docs/SCHOOL_DEPLOYMENT.md` | 학교 배포 안내 문서 |
| `scripts/package-school-deploy.ps1` | 학교 배포 ZIP 생성 스크립트 |

## 데이터 모델

### chemicals 시트
```
id | name | category | unit | stock | minStock | location
hazards (JSON array) | msdsUrl | memo | supplier | lastUpdated
aliases (JSON array) | casNo
```

### logs 시트
```
id | chemicalId | chemicalName | type(in/out) | amount | unit
user | purpose | note | date(ISO)
```

### experiments 시트
```
id | name | description | subject | grade
```

### experiment_chemicals 시트
```
experimentId | chemicalName | amount | unit | note
```
고유 id 없음. 삭제 시 `experimentId||chemicalName` 복합키 사용.

## gsheets.js API

```javascript
// URL 관리
getGSheetsUrl() / setGSheetsUrl(url) / clearGSheetsUrl() / isDemoMode()

// 약품 CRUD
fetchChemicals() / addChemical(data) / updateChemical(id, data) / deleteChemical(id)

// 입출고 CRUD
fetchLogs() / recordTransactions(logs) / addLog(data) / updateLog(id, data) / deleteLog(id)

// 실험 CRUD
fetchExperiments() / addExperiment(data) / deleteExperiment(id)

// 실험 재료 CRUD
fetchExpChemicals(experimentId?)  // 인자 없으면 전체 반환
addExpChemical(data) / deleteExpChemical(id)

// 배치 삽입 (프리셋 임포트용)
batchAddRows(sheet, rows)
```

## Apps Script 액션 목록

### doGet actions
- `getChemicals` / `getLogs` / `getExperiments` / `getExpChemicals`

### doPost actions
- `addChemical` / `updateChemical` / `updateChemicalDetails` / `deleteChemical`
- `addLog` / `recordTransactions` / `updateLog` / `deleteLog`
- `addExperiment` / `deleteExperiment` (experiment_chemicals 연쇄 삭제 포함)
- `addExpChemical` / `deleteExpChemical`
- `batchAddRows` — `{ sheet, rows[] }` 배치 삽입

## 핵심 도메인 함수 (`src/domain/inventory.js`)

```javascript
normalizeChemical(raw)    // DB 데이터 → 앱 형식 정규화
normalizeLog(raw)         // 로그 정규화
convertToBase(amount, fromUnit, baseUnit)  // 단위 변환 (g/mg/kg, mL/L)
findChemicalByName(chemicals, name)        // name·aliases·id 매칭 검색
toArray(value)            // CSV 문자열 또는 배열 → 배열
makeId(prefix)            // 고유 ID 생성 (C, L, EXP 접두사)
applyTransactions(chemicals, entries)      // 출납 일괄 검증 후 메모리 재고 반영
```

출납 화면은 `recordTransactions`를 호출합니다. Apps Script는 `LockService` 잠금 안에서 최신 재고를 다시 확인하고 로그와 재고를 함께 반영합니다. 출고 수량은 재고를 초과할 수 없으며, 재시도는 같은 로그 ID로 중복 차감을 막습니다.

## 탭 구성

1. **재고현황** — 약품 카드 그리드, 검색·분류 필터
2. **실험재료** — 실험 검색, 필요 약품·재고 확인, 준비 완료 일괄 출고
3. **입출고이력** — 로그 목록
4. **QR스캔** — html5-qrcode 스캐너

## 알려진 설계 결정 및 주의사항

### Apps Script CORS
- Apps Script Web App을 "누구나 접근 가능"으로 배포하면 Google 인프라가 CORS 헤더 자동 추가.
- `gsheets-backend.gs`의 `jsonResponse`에 포함된 `cors` 필드는 실제 HTTP 헤더가 아닌 디버그용 body 데이터임. 별도 우회 불필요.
- `doOptions()` 함수는 Apps Script에서 자동 호출되지 않음 (무해하지만 미사용).

### 폴링 방식 동기화
- 실시간 구독 없음. 30초 interval로 `loadData()` 호출.
- interval useEffect 의존성 `[chemicals.length]`로 인해 약품 추가/삭제 시 타이머 리셋됨 (기능에 영향 없음).

### experiment_chemicals 고유 키 없음
- 삭제는 `experimentId||chemicalName` 복합키로 처리.
- 같은 실험에 동일 약품명 중복 등록 시 첫 번째 행만 삭제됨.

### 단위 변환 적용 범위
`convertToBase`는 g/mg/kg, mL/L만 처리. `개` 단위는 1:1 변환(동일 단위 전제).

### 번들 크기 경고
`html5-qrcode` 라이브러리로 인해 `npm run build` 시 chunk size 경고 발생. 빌드 실패 아님.

## 개발 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run package:school -- -SchoolName "학교명"  # 배포 ZIP 생성
```

## 학교 배포 흐름

1. 교사가 Google Sheets 새 파일 생성 (시트명: chemicals, logs, experiments, experiment_chemicals)
2. `public/gsheets-backend.gs` 내용을 Apps Script 편집기에 붙여넣기
3. Apps Script → 배포 → 웹앱으로 배포 (실행: 본인, 접근: 누구나)
4. 앱 설정 화면에서 웹앱 URL 입력 → 연결

## 수정 이력 요약 (주요 버그 수정)

- **실험 삭제 cascade**: `deleteExperiment` 시 `experiment_chemicals` 행 자동 삭제 (Apps Script)
- **N+1 쿼리 제거**: `loadData`에서 실험별 개별 호출 → `fetchExpChemicals()` 단일 호출로 통합
- **markPrepared race condition**: 동일 약품 복수 처리 시 `updatedStocks` 맵으로 누적 차감
- **importPresets 배치**: 51개 개별 호출 → `batchAddRows` 2회 호출로 단축
