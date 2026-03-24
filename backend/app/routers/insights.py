"""자산 변동 인사이트 + 순자산 마일스톤 + 비상금 진단 + 구독료 관리"""
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Income, Expense, AssetHistory, Goal

router = APIRouter(prefix="/api/insights", tags=["insights"])


# === 자산 변동 인사이트 ===
class Insight(BaseModel):
    type: str  # positive, warning, info, milestone
    icon: str
    message: str
    detail: str | None = None


@router.get("/daily", response_model=list[Insight])
def daily_insights(db: Session = Depends(get_db)):
    """오늘의 재무 인사이트 자동 생성"""
    insights: list[Insight] = []
    today = date.today()

    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()
    net_worth = total_assets - total_debts
    monthly_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.is_monthly.is_(True)).scalar()
    monthly_expense = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.is_monthly.is_(True)).scalar()
    savings = monthly_income - monthly_expense

    # 이전 스냅샷 대비
    prev = db.query(AssetHistory).order_by(AssetHistory.record_date.desc()).offset(1).first()
    latest = db.query(AssetHistory).order_by(AssetHistory.record_date.desc()).first()

    if prev and latest:
        nw_diff = latest.net_worth - prev.net_worth
        if nw_diff > 0:
            insights.append(Insight(
                type="positive", icon="trending_up",
                message=f"순자산이 전월 대비 {nw_diff:,.0f}원 증가했습니다",
                detail=f"{prev.net_worth:,.0f}원 → {latest.net_worth:,.0f}원",
            ))
        elif nw_diff < 0:
            insights.append(Insight(
                type="warning", icon="trending_down",
                message=f"순자산이 전월 대비 {abs(nw_diff):,.0f}원 감소했습니다",
                detail="지출 점검을 권장합니다",
            ))

    # 마일스톤 체크
    milestones = [
        (100_000_000, "1억"), (500_000_000, "5억"), (1_000_000_000, "10억"),
        (1_500_000_000, "15억"), (2_000_000_000, "20억"), (3_000_000_000, "30억"),
    ]
    for amount, label in milestones:
        if net_worth >= amount and (not prev or prev.net_worth < amount):
            insights.append(Insight(
                type="milestone", icon="emoji_events",
                message=f"축하합니다! 순자산 {label} 돌파!",
            ))
        elif net_worth < amount:
            gap = amount - net_worth
            months_needed = gap / savings if savings > 0 else None
            insights.append(Insight(
                type="info", icon="flag",
                message=f"순자산 {label}까지 {gap:,.0f}원 남았습니다",
                detail=f"현재 저축률 기준 약 {months_needed:.0f}개월" if months_needed and months_needed < 600 else None,
            ))
            break

    # 저축률 분석
    if monthly_income > 0:
        rate = savings / monthly_income * 100
        if rate >= 30:
            insights.append(Insight(type="positive", icon="savings", message=f"저축률 {rate:.0f}%! 훌륭합니다"))
        elif rate >= 20:
            insights.append(Insight(type="info", icon="savings", message=f"저축률 {rate:.0f}%, 양호합니다"))
        elif rate > 0:
            insights.append(Insight(type="warning", icon="savings", message=f"저축률 {rate:.0f}%로 낮습니다. 20% 이상을 권장합니다"))
        else:
            insights.append(Insight(type="warning", icon="warning", message="지출이 수입을 초과하고 있습니다"))

    # 부채비율
    if total_assets > 0:
        debt_ratio = total_debts / total_assets * 100
        if debt_ratio > 50:
            insights.append(Insight(type="warning", icon="account_balance", message=f"부채비율 {debt_ratio:.0f}%로 높습니다"))
        elif debt_ratio > 30:
            insights.append(Insight(type="info", icon="account_balance", message=f"부채비율 {debt_ratio:.0f}%, 관리 가능 수준"))

    # 자산 집중도
    CAT_KR = {"real_estate": "부동산", "deposit": "예적금", "stock": "주식", "fund": "펀드", "crypto": "암호화폐", "insurance": "보험", "pension": "연금", "cash": "현금", "other": "기타"}
    cat_rows = db.query(Asset.category, func.sum(Asset.amount)).group_by(Asset.category).all()
    if cat_rows and total_assets > 0:
        max_cat, max_val = max(cat_rows, key=lambda x: x[1])
        ratio = max_val / total_assets * 100
        cat_label = CAT_KR.get(max_cat.value if hasattr(max_cat, 'value') else max_cat, max_cat)
        if ratio > 70:
            insights.append(Insight(
                type="warning", icon="pie_chart",
                message=f"자산의 {ratio:.0f}%가 {cat_label}에 집중되어 있습니다",
                detail="분산 투자를 고려해보세요",
            ))

    # 비상금 진단
    cash_like = db.query(func.coalesce(func.sum(Asset.amount), 0)).filter(
        Asset.category.in_(["deposit", "cash"])
    ).scalar()
    if monthly_expense > 0:
        emergency_months = cash_like / monthly_expense
        if emergency_months < 3:
            insights.append(Insight(
                type="warning", icon="shield",
                message=f"비상금 {emergency_months:.1f}개월분 (권장 6개월)",
                detail=f"현재 {cash_like:,.0f}원 / 월 지출 {monthly_expense:,.0f}원",
            ))
        elif emergency_months < 6:
            insights.append(Insight(
                type="info", icon="shield",
                message=f"비상금 {emergency_months:.1f}개월분 (권장 6개월까지 {(6 * monthly_expense - cash_like):,.0f}원 추가 필요)",
            ))
        else:
            insights.append(Insight(
                type="positive", icon="shield",
                message=f"비상금 {emergency_months:.1f}개월분으로 충분합니다",
            ))

    # 목표 임박
    goals = db.query(Goal).all()
    for g in goals:
        if g.target_date:
            days = (g.target_date - today).days
            if 0 < days <= 90:
                progress = min(100, net_worth / g.target_amount * 100) if g.target_amount > 0 else 0
                insights.append(Insight(
                    type="info", icon="timer",
                    message=f"목표 '{g.name}' D-{days} ({progress:.0f}% 달성)",
                ))

    return insights


# === 비상금 진단 상세 ===
class EmergencyFundDiagnosis(BaseModel):
    cash_and_deposits: float
    monthly_expense: float
    months_covered: float
    recommended_months: int
    recommended_amount: float
    gap: float
    status: str  # safe, caution, danger


@router.get("/emergency-fund", response_model=EmergencyFundDiagnosis)
def emergency_fund(recommended_months: int = 6, db: Session = Depends(get_db)):
    cash_like = db.query(func.coalesce(func.sum(Asset.amount), 0)).filter(
        Asset.category.in_(["deposit", "cash"])
    ).scalar()
    monthly_expense = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.is_monthly.is_(True)
    ).scalar()

    months = cash_like / monthly_expense if monthly_expense > 0 else 0
    recommended = monthly_expense * recommended_months
    gap = max(0, recommended - cash_like)
    status = "safe" if months >= recommended_months else ("caution" if months >= 3 else "danger")

    return EmergencyFundDiagnosis(
        cash_and_deposits=cash_like,
        monthly_expense=monthly_expense,
        months_covered=round(months, 1),
        recommended_months=recommended_months,
        recommended_amount=recommended,
        gap=gap,
        status=status,
    )
