# JASAN - 개인 자산관리 토탈 솔루션

자산 현황 관리, 목표 시뮬레이션, 연금 추정, 세금 계산, 부동산 분석을 하나의 웹앱에서.

## 기술 스택

- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **Frontend**: React + TypeScript + TailwindCSS + Recharts
- **동기화**: Google Drive (변경분 동기화)

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

## 로드맵

- [x] Phase 1: 자산/부채 CRUD, 대시보드, 수입/지출, 연금, 목표
- [ ] Phase 2: 목표 시뮬레이션, 연금 추정 엔진
- [ ] Phase 3: 세금/법령 엔진 (증여세, 양도세 등)
- [ ] Phase 4: 부동산 시세/추천 (국토부 API)
- [ ] Phase 5: Google Drive 동기화, 키움/신한 API 연동
- [ ] Phase 6: AI 제안 엔진
