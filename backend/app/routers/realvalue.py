"""물가 반영 실질가치 계산 API"""
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Pension, Goal, BigExpense

router = APIRouter(prefix="/api/realvalue", tags=["realvalue"])

DEFAULT_INFLATION = 2.5  # 기본 물가상승률 (%)


class RealValueResult(BaseModel):
    nominal: float       # 명목 금액
    real: float          # 현재 가치 기준 실질 금액
    years: float         # 몇 년 후
    inflation_rate: float
    purchasing_power_loss: float  # 구매력 손실률 (%)


class FullRealValueReport(BaseModel):
    inflation_rate: float
    pension_analysis: list[dict]
    goal_analysis: list[dict]
    big_expense_analysis: list[dict]
    net_worth_future: list[dict]  # 10/20/30년 후 현재가치


def _to_real(nominal: float, years: float, inflation: float) -> float:
    """명목 금액을 현재 가치로 환산"""
    if years <= 0:
        return nominal
    return round(nominal / ((1 + inflation / 100) ** years))


def _purchasing_power_loss(years: float, inflation: float) -> float:
    """구매력 손실률 (%)"""
    if years <= 0:
        return 0
    return round((1 - 1 / ((1 + inflation / 100) ** years)) * 100, 1)


@router.get("/convert")
def convert_single(
    amount: float,
    years: float,
    inflation_rate: float = DEFAULT_INFLATION,
) -> RealValueResult:
    """단일 금액의 실질가치 환산"""
    real = _to_real(amount, years, inflation_rate)
    return RealValueResult(
        nominal=amount,
        real=real,
        years=years,
        inflation_rate=inflation_rate,
        purchasing_power_loss=_purchasing_power_loss(years, inflation_rate),
    )


@router.get("/report")
def full_report(
    current_age: int = 35,
    retirement_age: int = 65,
    inflation_rate: float = DEFAULT_INFLATION,
    db: Session = Depends(get_db),
) -> FullRealValueReport:
    """전체 실질가치 리포트"""
    years_to_retire = max(0, retirement_age - current_age)

    # --- 연금 분석 ---
    pensions = db.query(Pension).all()
    pension_analysis = []
    for p in pensions:
        if p.expected_monthly and p.expected_monthly > 0:
            real_monthly = _to_real(p.expected_monthly, years_to_retire, inflation_rate)
            loss = _purchasing_power_loss(years_to_retire, inflation_rate)
            pension_analysis.append({
                "type": p.pension_type,
                "institution": p.institution,
                "nominal_monthly": p.expected_monthly,
                "real_monthly": real_monthly,
                "years_until": years_to_retire,
                "loss_pct": loss,
                "note": f"지금 {round(p.expected_monthly/10000)}만원은 {years_to_retire}년 후 체감 {round(real_monthly/10000)}만원",
            })

    # --- 목표 분석 ---
    from datetime import date
    today = date.today()
    goals = db.query(Goal).all()
    goal_analysis = []
    for g in goals:
        if g.target_date:
            years = max(0, (g.target_date - today).days / 365.25)
            real_target = _to_real(g.target_amount, years, inflation_rate)
            # 물가 반영 시 실제로 필요한 명목 금액
            inflation_adjusted_need = round(g.target_amount * ((1 + inflation_rate / 100) ** years))
            goal_analysis.append({
                "name": g.name,
                "target_nominal": g.target_amount,
                "target_real_today": real_target,
                "inflation_adjusted_need": inflation_adjusted_need,
                "years": round(years, 1),
                "note": f"목표 {round(g.target_amount/100000000, 1)}억은 {round(years,1)}년 후 체감 {round(real_target/100000000, 1)}억 (물가 반영 시 실제 필요액: {round(inflation_adjusted_need/100000000, 1)}억)",
            })

    # --- 목돈 지출 분석 ---
    big_expenses = db.query(BigExpense).filter(BigExpense.is_completed.is_(False)).all()
    big_expense_analysis = []
    for e in big_expenses:
        years = max(0, (e.planned_date - today).days / 365.25)
        if years > 0.5:  # 6개월 이상 남은 것만
            inflation_adjusted = round(e.amount * ((1 + inflation_rate / 100) ** years))
            big_expense_analysis.append({
                "name": e.name,
                "planned_amount": e.amount,
                "inflation_adjusted": inflation_adjusted,
                "extra_needed": inflation_adjusted - e.amount,
                "years": round(years, 1),
            })

    # --- 순자산 미래 가치 ---
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()
    net_worth = total_assets - total_debts

    net_worth_future = []
    for y in [5, 10, 15, 20, 25, 30]:
        real = _to_real(net_worth, y, inflation_rate)
        loss = _purchasing_power_loss(y, inflation_rate)
        net_worth_future.append({
            "years": y,
            "nominal": net_worth,
            "real_value": real,
            "loss_pct": loss,
            "note": f"현재 순자산 {round(net_worth/100000000,1)}억의 {y}년 후 체감가치: {round(real/100000000,1)}억 (구매력 {loss}% 감소)",
        })

    return FullRealValueReport(
        inflation_rate=inflation_rate,
        pension_analysis=pension_analysis,
        goal_analysis=goal_analysis,
        big_expense_analysis=big_expense_analysis,
        net_worth_future=net_worth_future,
    )
