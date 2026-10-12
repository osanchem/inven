# 시약장 관리 앱 설치 안내

Google 스프레드시트가 데이터베이스이며, Apps Script가 앱과 시트를 연결합니다. PDF 출납대장 자료를 포함하려면 **비어 있는 새 스프레드시트**에서 시작하세요.

## 1. 새 스프레드시트 만들기

1. [sheets.new](https://sheets.new)를 열고 새 스프레드시트를 만듭니다.
2. 상단 메뉴에서 **확장 프로그램 → Apps Script**를 선택합니다.

## 2. 백엔드와 원장 데이터 넣기

앱의 연결 화면에서 **백엔드 코드 복사**를 누릅니다. Apps Script의 `Code.gs` 내용을 지우고 복사한 코드를 붙여넣은 다음 저장합니다.

배포 패키지를 사용하는 경우 `apps-script/gsheets-backend.gs`의 전체 내용을 `Code.gs`에 붙여넣고 저장합니다.

## 3. 시트와 원장 자료 초기화

Apps Script 편집기 상단의 함수 목록에서 **initializeDatabase**를 선택하고 **실행**을 누릅니다. 처음 실행할 때 Google 권한 요청을 허용합니다.

초기화가 끝나면 `chemicals`, `logs`, `experiments`, `experiment_chemicals` 탭과 열 이름이 준비됩니다. `chemicals`와 `logs`에 데이터 행이 있으면 중복 입력을 막기 위해 초기화가 중단됩니다.

## 4. PDF 원장 자료 가져오기

배포 패키지의 `data` 폴더에서 두 CSV 파일을 각각 가져옵니다.

1. `chemicals` 탭을 선택하고 **파일 → 가져오기**에서 `google_sheets_chemicals.csv`를 업로드합니다.
2. 가져오기 위치를 **현재 시트 바꾸기**로 지정합니다.
3. `logs` 탭을 선택하고 `google_sheets_logs.csv`도 같은 방법으로 가져옵니다.

CSV에는 약품 149개와 출납 이력 156건이 있습니다. PDF 기록의 수량은 원장에 마지막으로 적힌 잔량입니다. 기록 날짜가 대부분 과거이므로 약품을 실제로 확인하고 재고를 수정한 뒤 출납을 시작하세요. 원장에 표시된 유독물 36건은 위험 표시로 가져오며, CAS 번호·최소 재고·구매처 등 원장에 없는 정보는 비워 둡니다.

## 5. Apps Script 웹 앱 배포

1. **배포 → 새 배포**를 선택하고 유형으로 **웹 앱**을 고릅니다.
2. 실행 사용자는 **나**, 액세스 권한은 **모든 사용자**로 설정하고 배포합니다.
3. Google 계정 권한 요청을 승인합니다.
4. 표시되는 `/exec`로 끝나는 웹 앱 URL을 복사합니다.

## 6. GitHub Pages에 앱 배포

저장소에 포함된 `.github/workflows/deploy.yml`이 `main` 브랜치에 새 커밋이 올라올 때 앱을 빌드하고 GitHub Pages로 배포합니다.

1. GitHub 저장소에서 **Settings → Pages**를 엽니다.
2. **Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. 변경 사항을 `main` 브랜치에 커밋하고 푸시합니다. 저장소의 **Actions** 탭에서 배포가 끝날 때까지 기다립니다.
4. 앱 주소 `https://osanchem.github.io/inven/`를 엽니다.

Vite의 `/inven/` 경로는 GitHub Pages용 설정에 반영되어 있습니다. `data`와 `release` 폴더는 `.gitignore`에 포함되어 GitHub 저장소와 웹 배포에 올라가지 않습니다. CSV는 앞 단계에서 로컬 배포 패키지의 `data` 폴더로 Google 스프레드시트에 가져옵니다.

Netlify를 사용하려면 배포 패키지의 `web` 폴더를 [Netlify Drop](https://app.netlify.com/drop)에 올릴 수 있습니다.

## 7. 앱에 연결

연결 화면의 웹 앱 URL 입력란에 5단계에서 복사한 Apps Script 주소를 붙여넣고 **연결**을 누릅니다. 이후 약품 등록, 재고 변경, 출납 이력이 해당 스프레드시트에 저장됩니다.

## 데이터 구조

| 시트 | 내용 |
|---|---|
| `chemicals` | 약품 정보와 현재 앱 재고 |
| `logs` | 입고·출고 이력 |
| `experiments` | 실험 정보 |
| `experiment_chemicals` | 실험별 약품 사용 정보 |

다른 기기에서도 같은 앱과 Apps Script URL을 사용하면 동일한 시트 데이터를 봅니다. 스프레드시트를 직접 수정한 내용도 앱에 반영됩니다.
