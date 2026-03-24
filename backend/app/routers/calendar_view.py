"""재무 캘린더: 지출, 목돈, 급여, 대출상환 등 일정 통합"""
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BigExpense, Debt, Income, ActualSpending

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/events")
def get_calendar_events(year: int = 2026, month: int = 3, db: Session = Depends(get_db)):
    """해당 월의 모든 재무 이벤트"""
    events = []
    ym = f"{year}-{month:02d}"
    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)

    # 급여일 (매월 수입)
    incomes = db.query(Income).filter(Income.is_monthly.is_(True)).all()
    for inc in incomes:
        events.append({
            "date": f"{ym}-25",  # 급여일 25일 가정
            "type": "income",
            "category": "수입",
            "name": inc.source,
            "amount": inc.amount,
            "color": "#2563eb",
        })

    # 대출 상환일 (매월)
    debts = db.query(Debt).filter(Debt.monthly_payment.isnot(None)).all()
    for d in debts:
        events.append({
            "date": f"{ym}-05",  # 상환일 5일 가정
            "type": "debt",
            "category": "대출상환",
            "name": d.name,
            "amount": -d.monthly_payment,
            "color": "#dc2626",
        })

    # 목돈 지출
    big_expenses = (
        db.query(BigExpense)
        .filter(BigExpense.planned_date >= month_start, BigExpense.planned_date <= month_end)
        .filter(BigExpense.is_completed.is_(False))
        .all()
    )
    for e in big_expenses:
        events.append({
            "date": str(e.planned_date),
            "type": "big_expense",
            "category": e.category,
            "name": e.name,
            "amount": -e.amount,
            "color": "#8b5cf6",
        })

    # 실제 지출 기록
    spendings = (
        db.query(ActualSpending)
        .filter(ActualSpending.year_month == ym)
        .filter(ActualSpending.spend_date.isnot(None))
        .all()
    )
    for s in spendings:
        events.append({
            "date": str(s.spend_date),
            "type": "spending",
            "category": s.category,
            "name": s.name,
            "amount": -s.amount,
            "color": "#f97316",
        })

    events.sort(key=lambda x: x["date"])
    return {"year": year, "month": month, "events": events}


# === 연간 결산 ===
@router.get("/annual-summary")
def annual_summary(year: int = 2025, db: Session = Depends(get_db)):
    """연간 재무 결산 리포트"""
    from sqlalchemy import func
    from app.models import Asset, AssetHistory, Expense as ExpModel

    # 연초/연말 스냅샷
    year_start = db.query(AssetHistory).filter(
        AssetHistory.record_date >= date(year, 1, 1),
        AssetHistory.record_date <= date(year, 3, 31),
    ).order_by(AssetHistory.record_date).first()

    year_end = db.query(AssetHistory).filter(
        AssetHistory.record_date >= date(year, 10, 1),
        AssetHistory.record_date <= date(year, 12, 31),
    ).order_by(AssetHistory.record_date.desc()).first()

    nw_start = year_start.net_worth if year_start else 0
    nw_end = year_end.net_worth if year_end else 0
    nw_change = nw_end - nw_start

    # 월별 지출 합계
    monthly_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.is_monthly.is_(True)).scalar()
    monthly_expense = db.query(func.coalesce(func.sum(ExpModel.amount), 0)).filter(ExpModel.is_monthly.is_(True)).scalar()
    annual_income = monthly_income * 12
    annual_expense = monthly_expense * 12
    annual_savings = annual_income - annual_expense
    savings_rate = round(annual_savings / annual_income * 100, 1) if annual_income > 0 else 0

    # 카테고리별 지출
    cat_rows = db.query(ExpModel.category, func.sum(ExpModel.amount)).filter(
        ExpModel.is_monthly.is_(True)
    ).group_by(ExpModel.category).all()
    top_categories = sorted(
        [{"category": r[0], "annual": round(r[1] * 12)} for r in cat_rows],
        key=lambda x: x["annual"], reverse=True,
    )

    return {
        "year": year,
        "net_worth_start": nw_start,
        "net_worth_end": nw_end,
        "net_worth_change": nw_change,
        "annual_income": round(annual_income),
        "annual_expense": round(annual_expense),
        "annual_savings": round(annual_savings),
        "savings_rate": savings_rate,
        "top_expense_categories": top_categories[:5],
        "highlights": [
            f"순자산 변동: {nw_change:+,.0f}원",
            f"연간 저축률: {savings_rate}%",
            f"가장 큰 지출: {top_categories[0]['category']} ({top_categories[0]['annual']:,.0f}원/년)" if top_categories else "",
        ],
    }
