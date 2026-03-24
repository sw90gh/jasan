from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Income, Expense

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


class SimulationRequest(BaseModel):
    target_amount: float
    target_years: int = 10
    monthly_saving: float | None = None  # None이면 현재 저축액 사용
    annual_return_rate: float = 5.0  # 연 수익률 (%)
    inflation_rate: float = 2.5  # 물가상승률 (%)


class SimulationYear(BaseModel):
    year: int
    age_label: str  # "1년차", "2년차" 등
    total_invested: float
    investment_return: float
    total_value: float
    real_value: float  # 물가 반영 실질 가치


class SimulationResult(BaseModel):
    current_net_worth: float
    monthly_saving_used: float
    target_amount: float
    target_reached_year: int | None  # 목표 도달 연차 (None이면 미도달)
    yearly_projection: list[SimulationYear]
    scenarios: list[dict]  # 수익률별 시나리오


class GapAnalysis(BaseModel):
    target_amount: float
    current_net_worth: float
    gap: float
    monthly_saving: float
    annual_return_rate: float
    years_to_goal: float | None
    required_monthly_saving: float  # 현재 수익률로 목표 달성에 필요한 월 저축액
    required_return_rate: float | None  # 현재 저축액으로 목표 달성에 필요한 수익률


def _get_current_financials(db: Session):
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()
    monthly_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(Income.is_monthly.is_(True))
        .scalar()
    )
    monthly_expense = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.is_monthly.is_(True))
        .scalar()
    )
    return total_assets, total_debts, monthly_income, monthly_expense


@router.post("/project", response_model=SimulationResult)
def run_simulation(req: SimulationRequest, db: Session = Depends(get_db)):
    total_assets, total_debts, monthly_income, monthly_expense = _get_current_financials(db)
    net_worth = total_assets - total_debts
    monthly_saving = req.monthly_saving if req.monthly_saving is not None else (monthly_income - monthly_expense)

    monthly_rate = req.annual_return_rate / 100 / 12
    monthly_inflation = req.inflation_rate / 100 / 12

    # Year-by-year projection
    yearly = []
    balance = net_worth
    total_invested = net_worth
    target_reached_year = None

    for year in range(1, req.target_years + 1):
        for _ in range(12):
            balance = balance * (1 + monthly_rate) + monthly_saving
            total_invested += monthly_saving

        investment_return = balance - total_invested
        real_value = balance / ((1 + req.inflation_rate / 100) ** year)

        yearly.append(SimulationYear(
            year=year,
            age_label=f"{year}년차",
            total_invested=round(total_invested),
            investment_return=round(investment_return),
            total_value=round(balance),
            real_value=round(real_value),
        ))

        if target_reached_year is None and balance >= req.target_amount:
            target_reached_year = year

    # Scenarios: 3%, 5%, 7%, 10% return rates
    scenarios = []
    for rate in [3.0, 5.0, 7.0, 10.0]:
        m_rate = rate / 100 / 12
        bal = net_worth
        for _ in range(req.target_years * 12):
            bal = bal * (1 + m_rate) + monthly_saving
        scenarios.append({
            "rate": rate,
            "label": f"연 {rate}%",
            "final_value": round(bal),
            "reaches_target": bal >= req.target_amount,
        })

    return SimulationResult(
        current_net_worth=round(net_worth),
        monthly_saving_used=round(monthly_saving),
        target_amount=req.target_amount,
        target_reached_year=target_reached_year,
        yearly_projection=yearly,
        scenarios=scenarios,
    )


@router.post("/gap", response_model=GapAnalysis)
def gap_analysis(req: SimulationRequest, db: Session = Depends(get_db)):
    """목표 대비 갭 분석: 필요 저축액, 필요 수익률 계산"""
    total_assets, total_debts, monthly_income, monthly_expense = _get_current_financials(db)
    net_worth = total_assets - total_debts
    monthly_saving = req.monthly_saving if req.monthly_saving is not None else (monthly_income - monthly_expense)
    gap = req.target_amount - net_worth

    monthly_rate = req.annual_return_rate / 100 / 12
    n_months = req.target_years * 12

    # Years to goal with current savings + return rate
    years_to_goal = None
    if monthly_saving > 0 or net_worth > 0:
        bal = net_worth
        for month in range(1, 600 + 1):  # max 50 years
            bal = bal * (1 + monthly_rate) + monthly_saving
            if bal >= req.target_amount:
                years_to_goal = round(month / 12, 1)
                break

    # Required monthly saving to reach target in given years
    # FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
    if monthly_rate > 0:
        fv_factor = (1 + monthly_rate) ** n_months
        pv_future = net_worth * fv_factor
        remaining = req.target_amount - pv_future
        annuity_factor = (fv_factor - 1) / monthly_rate
        required_monthly = max(0, remaining / annuity_factor) if annuity_factor > 0 else 0
    else:
        required_monthly = max(0, (req.target_amount - net_worth) / n_months) if n_months > 0 else 0

    # Required return rate (binary search)
    required_rate = None
    if monthly_saving > 0 and gap > 0:
        lo, hi = 0.0, 50.0
        for _ in range(100):
            mid = (lo + hi) / 2
            m_r = mid / 100 / 12
            bal = net_worth
            for _ in range(n_months):
                bal = bal * (1 + m_r) + monthly_saving
            if bal >= req.target_amount:
                hi = mid
            else:
                lo = mid
        required_rate = round((lo + hi) / 2, 2)

    return GapAnalysis(
        target_amount=req.target_amount,
        current_net_worth=round(net_worth),
        gap=round(gap),
        monthly_saving=round(monthly_saving),
        annual_return_rate=req.annual_return_rate,
        years_to_goal=years_to_goal,
        required_monthly_saving=round(required_monthly),
        required_return_rate=required_rate,
    )
