# JASAN - 개인 자산관리 토탈 솔루션

자산 현황 관리, 목표 시뮬레이션, 연금 추정, 세금 계산, 부동산 분석, AI 재무 어드바이저를 하나의 웹앱에서.

## 기능

| 탭 | 기능 |
|---|---|
| 대시보드 | 총자산/부채/순자산, 파이차트, 자산추이 그래프 |
| 자산 | 카테고리별(부동산/예적금/주식/펀드/코인 등) CRUD |
| 부채 | 대출 종류별 관리, 금리, 월 상환액 |
| 수입/지출 | 월정기 수입/지출 관리, 저축액 자동계산 |
| 연금 | 국민/퇴직/개인연금 관리 |
| 목표 | 목표 설정, 진행률, 월 필요 저축액 |
| 시뮬레이션 | 복리 기반 목표 도달 시뮬레이션, 수익률별 시나리오 |
| 연금추정 | 3대 연금 통합 추정, 소득대체율, 부족분 분석 |
| 세금 | 증여세/양도세/종합소득세 계산, 절세 전략 제안 |
| 부동산 | 국토부 실거래가 API, 내 아파트 검색 |
| 어드바이저 | 월간 리포트, 포트폴리오 분석, 정부 정책 가이드 |
| 동기화 | Google Drive 암호화 동기화, 키움/신한 연동 상태 |

## 기술 스택

- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + TypeScript + TailwindCSS + Recharts
- **동기화**: Google Drive (AES 암호화)
- **외부 연동**: 키움증권 Open API, 오픈뱅킹 API, 국토부 공공데이터 API

## 실행 방법

### Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 외부 API 설정

`backend/.env` 파일 생성 후 필요한 키를 설정:

```env
# 부동산 실거래가 (data.go.kr)
DATA_GO_KR_API_KEY=발급키

# 키움증권 (한국투자증권 Open API)
KIUM_APP_KEY=
KIUM_APP_SECRET=
KIWOOM_ACCOUNT=

# 오픈뱅킹 (신한은행 등)
OPENBANKING_ACCESS_TOKEN=

# Google Drive 동기화
SYNC_ENCRYPTION_KEY=원하는비밀키
```

## 로드맵

- [x] Phase 1: 자산/부채 CRUD, 대시보드, 수입/지출, 연금, 목표
- [x] Phase 2: 목표 시뮬레이션, 연금 추정 엔진
- [x] Phase 3: 세금/법령 엔진 (증여세, 양도세, 종합소득세, 절세전략)
- [x] Phase 4: 부동산 시세 (국토부 실거래가 API)
- [x] Phase 5: Google Drive 동기화, 키움/신한 API 연동
- [x] Phase 6: AI 재무 어드바이저, 월간 리포트, 정부 정책 가이드
