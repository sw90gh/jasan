"""
데모용 샘플 데이터 시드 스크립트
실행: python seed_demo.py
"""
import json
from datetime import date, datetime, timedelta

# Python path fix
import sys
sys.path.insert(0, ".")

from app.database import engine, Base, SessionLocal
from app.models import Asset, Debt, Income, Expense, Pension, Goal, AssetHistory, BigExpense, ActualSpending

# DB 초기화
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# 기존 데이터 삭제
for model in [Asset, Debt, Income, Expense, Pension, Goal, AssetHistory, BigExpense, ActualSpending]:
    db.query(model).delete()
db.commit()

print("기존 데이터 삭제 완료")

# === 자산 등록 ===
assets = [
    # 부동산
    Asset(category="real_estate", name="래미안 아파트 (34평)", institution="서울 강남구 대치동",
          amount=1_850_000_000, purchase_price=1_200_000_000, memo="2019년 매입, 전세 보증금 8억 설정"),
    # 예적금
    Asset(category="deposit", name="신한 주거래 통장", institution="신한은행",
          amount=15_000_000, memo="생활비 통장"),
    Asset(category="deposit", name="신한 정기예금 (1년)", institution="신한은행",
          amount=50_000_000, purchase_price=50_000_000, memo="연 3.8%, 2026-09 만기"),
    Asset(category="deposit", name="비상금 통장", institution="카카오뱅크",
          amount=20_000_000, memo="6개월 생활비 비상금"),
    # 주식
    Asset(category="stock", name="삼성전자", institution="키움증권",
          amount=28_500_000, purchase_price=25_000_000, quantity=500, memo="평단가 50,000원"),
    Asset(category="stock", name="SK하이닉스", institution="키움증권",
          amount=18_000_000, purchase_price=15_000_000, quantity=100, memo="평단가 150,000원"),
    Asset(category="stock", name="NAVER", institution="키움증권",
          amount=9_600_000, purchase_price=10_000_000, quantity=40, memo="평단가 250,000원"),
    Asset(category="stock", name="카카오", institution="키움증권",
          amount=5_400_000, purchase_price=7_000_000, quantity=120, memo="평단가 58,333원"),
    # 펀드/ETF
    Asset(category="fund", name="TIGER S&P500 ETF", institution="키움증권",
          amount=32_000_000, purchase_price=28_000_000, quantity=450, memo="미국 지수 추종"),
    Asset(category="fund", name="KODEX 200 ETF", institution="키움증권",
          amount=15_000_000, purchase_price=14_000_000, quantity=400),
    # 암호화폐
    Asset(category="crypto", name="비트코인 (BTC)", institution="업비트",
          amount=12_000_000, purchase_price=8_000_000, quantity=0.1, memo="0.1 BTC"),
    Asset(category="crypto", name="이더리움 (ETH)", institution="업비트",
          amount=5_000_000, purchase_price=4_000_000, quantity=1.5, memo="1.5 ETH"),
    # 보험
    Asset(category="insurance", name="삼성생명 종신보험", institution="삼성생명",
          amount=35_000_000, purchase_price=28_000_000, memo="월 15만원 납입, 해약환급금 기준"),
    # 연금 (자산으로도 등록)
    Asset(category="pension", name="국민연금 (납부 누적)", institution="국민연금공단",
          amount=45_000_000, memo="17년 납부"),
    Asset(category="pension", name="퇴직연금 DC형", institution="신한은행",
          amount=68_000_000, purchase_price=60_000_000, memo="연 4% 수익"),
    Asset(category="pension", name="개인연금저축", institution="미래에셋증권",
          amount=42_000_000, purchase_price=36_000_000, memo="월 50만원 납입"),
    # 현금
    Asset(category="cash", name="현금 보유", amount=3_000_000),
    # 기타
    Asset(category="other", name="자동차 (현대 아반떼 2023)", amount=18_000_000, memo="감가 반영"),
]
db.add_all(assets)
db.commit()
print(f"자산 {len(assets)}건 등록 완료")

# === 부채 등록 ===
debts = [
    Debt(category="mortgage", name="주택담보대출", institution="신한은행",
         principal=500_000_000, remaining=420_000_000, interest_rate=3.65,
         monthly_payment=2_200_000, start_date=date(2019, 6, 15), end_date=date(2049, 6, 15),
         memo="30년 원리금균등, 고정금리"),
    Debt(category="credit", name="신용대출", institution="신한은행",
         principal=30_000_000, remaining=18_000_000, interest_rate=4.5,
         monthly_payment=850_000, start_date=date(2024, 3, 1), end_date=date(2027, 3, 1),
         memo="3년 만기"),
    Debt(category="car", name="자동차 할부", institution="현대캐피탈",
         principal=15_000_000, remaining=6_000_000, interest_rate=5.9,
         monthly_payment=420_000, start_date=date(2023, 7, 1), end_date=date(2026, 7, 1),
         memo="36개월 할부"),
]
db.add_all(debts)
db.commit()
print(f"부채 {len(debts)}건 등록 완료")

# === 수입 등록 ===
incomes = [
    Income(source="급여 (본업)", amount=5_500_000, is_monthly=True, memo="세후 실수령"),
    Income(source="부업 (프리랜서)", amount=1_200_000, is_monthly=True, memo="월 평균"),
    Income(source="전세 이자 수익", amount=250_000, is_monthly=True, memo="전세보증금 8억 운용"),
    Income(source="배당금 (분기)", amount=150_000, is_monthly=True, memo="월 환산, 분기 45만원"),
]
db.add_all(incomes)
db.commit()
print(f"수입 {len(incomes)}건 등록 완료")

# === 지출 등록 ===
expenses = [
    Expense(category="주거", name="주택담보대출 상환", amount=2_200_000, is_monthly=True),
    Expense(category="주거", name="관리비", amount=250_000, is_monthly=True),
    Expense(category="대출", name="신용대출 상환", amount=850_000, is_monthly=True),
    Expense(category="대출", name="자동차 할부", amount=420_000, is_monthly=True),
    Expense(category="식비", name="식료품 + 외식", amount=800_000, is_monthly=True),
    Expense(category="교통", name="교통비 (주유+교통카드)", amount=200_000, is_monthly=True),
    Expense(category="통신", name="통신비 (폰+인터넷)", amount=120_000, is_monthly=True),
    Expense(category="보험", name="보험료 (종신+실손)", amount=250_000, is_monthly=True),
    Expense(category="교육", name="자녀 학원비", amount=500_000, is_monthly=True),
    Expense(category="생활", name="생활용품+의류", amount=200_000, is_monthly=True),
    Expense(category="여가", name="문화/취미/운동", amount=150_000, is_monthly=True),
    Expense(category="저축", name="연금저축 납입", amount=500_000, is_monthly=True),
    Expense(category="저축", name="적금", amount=300_000, is_monthly=True),
]
db.add_all(expenses)
db.commit()
print(f"지출 {len(expenses)}건 등록 완료")

# === 연금 등록 ===
pensions = [
    Pension(pension_type="national", institution="국민연금공단",
            monthly_contribution=248_400, total_accumulated=45_000_000,
            expected_monthly=1_050_000, start_date=date(2009, 3, 1),
            memo="기준소득월액 276만원"),
    Pension(pension_type="retirement", institution="신한은행 (DC형)",
            monthly_contribution=230_000, total_accumulated=68_000_000,
            expected_monthly=None, start_date=date(2012, 1, 1),
            memo="회사 DC형 퇴직연금"),
    Pension(pension_type="personal", institution="미래에셋증권",
            monthly_contribution=500_000, total_accumulated=42_000_000,
            expected_monthly=None, start_date=date(2018, 1, 1),
            memo="연금저축펀드, 연 세액공제 활용"),
]
db.add_all(pensions)
db.commit()
print(f"연금 {len(pensions)}건 등록 완료")

# === 목표 등록 ===
goals = [
    Goal(name="순자산 20억 달성", target_amount=2_000_000_000,
         target_date=date(2040, 12, 31), priority=1,
         memo="은퇴 전 목표"),
    Goal(name="자녀 대학 교육비", target_amount=200_000_000,
         target_date=date(2035, 3, 1), priority=1,
         memo="2자녀 기준"),
    Goal(name="투자용 부동산 매입", target_amount=500_000_000,
         target_date=date(2030, 12, 31), priority=2,
         memo="소형 아파트 또는 오피스텔"),
    Goal(name="자동차 교체 (SUV)", target_amount=55_000_000,
         target_date=date(2028, 6, 1), priority=3,
         memo="현대 팰리세이드 or 기아 쏘렌토"),
]
db.add_all(goals)
db.commit()
print(f"목표 {len(goals)}건 등록 완료")

# === 목돈 지출 계획 ===
big_expenses = [
    BigExpense(name="산후조리원", category="의료", amount=5_000_000,
               planned_date=date(2026, 12, 15), saved_amount=2_000_000,
               memo="2주 기준, 강남권"),
    BigExpense(name="자녀1 유치원 입학준비", category="교육", amount=3_000_000,
               planned_date=date(2027, 2, 20), saved_amount=500_000,
               memo="원복+가방+교재비+입학금"),
    BigExpense(name="가족 제주도 여행", category="여행", amount=2_500_000,
               planned_date=date(2026, 8, 10), saved_amount=1_500_000,
               memo="4박5일, 렌트카 포함"),
    BigExpense(name="자동차 보험 (연납)", category="자동차", amount=1_200_000,
               planned_date=date(2026, 7, 1), saved_amount=0,
               memo="아반떼 자차포함"),
    BigExpense(name="종합소득세 납부", category="세금", amount=4_500_000,
               planned_date=date(2027, 5, 31), saved_amount=0,
               memo="프리랜서 소득분"),
    BigExpense(name="에어컨 교체", category="가전", amount=3_500_000,
               planned_date=date(2026, 5, 15), saved_amount=3_500_000,
               memo="거실+안방 2대, 이미 준비 완료"),
    BigExpense(name="친구 결혼식 축의금 (3건)", category="경조사", amount=900_000,
               planned_date=date(2026, 10, 20), saved_amount=0,
               memo="각 30만원씩"),
    BigExpense(name="명절 부모님 용돈+선물", category="경조사", amount=1_000_000,
               planned_date=date(2026, 9, 25), saved_amount=0,
               memo="추석"),
    BigExpense(name="건강검진 (부부)", category="의료", amount=800_000,
               planned_date=date(2026, 11, 1), saved_amount=0,
               memo="종합검진 2인"),
    BigExpense(name="타이어 교체", category="자동차", amount=600_000,
               planned_date=date(2026, 10, 1), saved_amount=0,
               memo="4계절 타이어 4본"),
]
db.add_all(big_expenses)
db.commit()
print(f"목돈 지출 {len(big_expenses)}건 등록 완료")

# === 실제 지출 (이번 달) ===
today = date.today()
ym = today.strftime("%Y-%m")
actual_spending = [
    ActualSpending(year_month=ym, category="주거", name="주택담보대출 상환", amount=2_200_000, spend_date=date(today.year, today.month, 5)),
    ActualSpending(year_month=ym, category="주거", name="관리비", amount=230_000, spend_date=date(today.year, today.month, 10)),
    ActualSpending(year_month=ym, category="대출", name="신용대출 상환", amount=850_000, spend_date=date(today.year, today.month, 5)),
    ActualSpending(year_month=ym, category="대출", name="자동차 할부", amount=420_000, spend_date=date(today.year, today.month, 15)),
    ActualSpending(year_month=ym, category="식비", name="마트 장보기", amount=320_000, spend_date=date(today.year, today.month, 8)),
    ActualSpending(year_month=ym, category="식비", name="외식 (가족)", amount=180_000, spend_date=date(today.year, today.month, 12)),
    ActualSpending(year_month=ym, category="식비", name="배달음식", amount=95_000, spend_date=date(today.year, today.month, 18)),
    ActualSpending(year_month=ym, category="교통", name="주유", amount=120_000, spend_date=date(today.year, today.month, 7)),
    ActualSpending(year_month=ym, category="교통", name="교통카드 충전", amount=50_000, spend_date=date(today.year, today.month, 1)),
    ActualSpending(year_month=ym, category="통신", name="핸드폰+인터넷", amount=118_000, spend_date=date(today.year, today.month, 20)),
    ActualSpending(year_month=ym, category="보험", name="보험료 자동이체", amount=250_000, spend_date=date(today.year, today.month, 25)),
    ActualSpending(year_month=ym, category="교육", name="자녀 학원비", amount=500_000, spend_date=date(today.year, today.month, 1)),
    ActualSpending(year_month=ym, category="생활", name="다이소+의류", amount=150_000, spend_date=date(today.year, today.month, 14)),
    ActualSpending(year_month=ym, category="여가", name="넷플릭스+헬스장", amount=85_000, spend_date=date(today.year, today.month, 1)),
    ActualSpending(year_month=ym, category="여가", name="가족 영화", amount=48_000, spend_date=date(today.year, today.month, 16)),
    ActualSpending(year_month=ym, category="저축", name="연금저축 납입", amount=500_000, spend_date=date(today.year, today.month, 5)),
    ActualSpending(year_month=ym, category="저축", name="적금", amount=300_000, spend_date=date(today.year, today.month, 5)),
    ActualSpending(year_month=ym, category="식비", name="커피/간식", amount=65_000, spend_date=date(today.year, today.month, 22)),
]
db.add_all(actual_spending)
db.commit()
print(f"실제 지출 {len(actual_spending)}건 등록 완료 ({ym})")

# === 자산 이력 (12개월) ===
today = date.today()
history_data = [
    # (months_ago, total_assets, total_debts)
    (12, 1_850_000_000, 480_000_000),
    (11, 1_870_000_000, 475_000_000),
    (10, 1_860_000_000, 470_000_000),
    (9,  1_900_000_000, 465_000_000),
    (8,  1_920_000_000, 460_000_000),
    (7,  1_910_000_000, 458_000_000),
    (6,  1_950_000_000, 455_000_000),
    (5,  1_980_000_000, 452_000_000),
    (4,  2_000_000_000, 450_000_000),
    (3,  2_020_000_000, 448_000_000),
    (2,  2_050_000_000, 446_000_000),
    (1,  2_070_000_000, 444_000_000),
]

for months_ago, total_a, total_d in history_data:
    record_date = today - timedelta(days=months_ago * 30)
    breakdown = {
        "real_estate": 1_850_000_000,
        "deposit": total_a * 0.04,
        "stock": total_a * 0.03,
        "fund": total_a * 0.025,
        "crypto": total_a * 0.008,
        "insurance": 35_000_000,
        "pension": total_a * 0.07,
    }
    db.add(AssetHistory(
        record_date=record_date,
        total_assets=total_a,
        total_debts=total_d,
        net_worth=total_a - total_d,
        breakdown=json.dumps(breakdown),
    ))

# 오늘 스냅샷
total_assets_now = sum(a.amount for a in assets)
total_debts_now = sum(d.remaining for d in debts)
cat_breakdown = {}
for a in assets:
    cat_breakdown[a.category] = cat_breakdown.get(a.category, 0) + a.amount

db.add(AssetHistory(
    record_date=today,
    total_assets=total_assets_now,
    total_debts=total_debts_now,
    net_worth=total_assets_now - total_debts_now,
    breakdown=json.dumps(cat_breakdown),
))

db.commit()
print(f"자산 이력 13건 등록 완료")

# 총계
print(f"\n===== 데모 데이터 등록 완료 =====")
print(f"총 자산: {total_assets_now:,.0f}원 ({total_assets_now/100000000:.1f}억)")
print(f"총 부채: {total_debts_now:,.0f}원 ({total_debts_now/100000000:.1f}억)")
print(f"순 자산: {total_assets_now - total_debts_now:,.0f}원 ({(total_assets_now - total_debts_now)/100000000:.1f}억)")
print(f"월 수입: {sum(i.amount for i in incomes):,.0f}원")
print(f"월 지출: {sum(e.amount for e in expenses):,.0f}원")
print(f"월 저축: {sum(i.amount for i in incomes) - sum(e.amount for e in expenses):,.0f}원")

db.close()
