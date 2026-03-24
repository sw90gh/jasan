"""예산 대비 실적 추적"""
from datetime import date
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Expense, ActualSpending

router = APIRouter(prefix="/api/budget", tags=["budget"])


class ActualSpendingCreate(BaseModel):
    year_month: str  # "2026-03"
    category: str
    name: str
    amount: float
    spend_date: date | None = None
    memo: str | None = None


class ActualSpendingResponse(BaseModel):
    id: int
    year_month: str
    category: str
    name: str
    amount: float
    spend_date: date | None
    memo: str | None

    model_config = {"from_attributes": True}


class BudgetCategory(BaseModel):
    category: str
    budget: float       # 예산 (월정기 지출 합계)
    actual: float       # 실제 지출
    diff: float         # 예산 - 실제 (양수=절약, 음수=초과)
    progress: float     # 사용률 (%)


class BudgetComparison(BaseModel):
    year_month: str
    total_budget: float
    total_actual: float
    total_diff: float
    savings_rate: float  # 절약률
    categories: list[BudgetCategory]
    spending_items: list[ActualSpendingResponse]


@router.post("/spending", response_model=ActualSpendingResponse, status_code=201)
def add_spending(data: ActualSpendingCreate, db: Session = Depends(get_db)):
    item = ActualSpending(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/spending/{year_month}", response_model=list[ActualSpendingResponse])
def list_spending(year_month: str, db: Session = Depends(get_db)):
    return (
        db.query(ActualSpending)
        .filter(ActualSpending.year_month == year_month)
        .order_by(ActualSpending.spend_date.desc(), ActualSpending.created_at.desc())
        .all()
    )


@router.delete("/spending/{spending_id}", status_code=204)
def delete_spending(spending_id: int, db: Session = Depends(get_db)):
    item = db.get(ActualSpending, spending_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()


@router.get("/compare/{year_month}", response_model=BudgetComparison)
def compare_budget(year_month: str, db: Session = Depends(get_db)):
    """예산 대비 실적 비교"""
    # 예산: 월정기 지출 (카테고리별)
    budget_rows = (
        db.query(Expense.category, func.sum(Expense.amount))
        .filter(Expense.is_monthly.is_(True))
        .group_by(Expense.category)
        .all()
    )
    budgets = {row[0]: row[1] for row in budget_rows}

    # 실적: 해당 월 실제 지출 (카테고리별)
    actual_rows = (
        db.query(ActualSpending.category, func.sum(ActualSpending.amount))
        .filter(ActualSpending.year_month == year_month)
        .group_by(ActualSpending.category)
        .all()
    )
    actuals = {row[0]: row[1] for row in actual_rows}

    # 모든 카테고리 합산
    all_cats = sorted(set(list(budgets.keys()) + list(actuals.keys())))
    categories = []
    total_budget = 0
    total_actual = 0

    for cat in all_cats:
        b = budgets.get(cat, 0)
        a = actuals.get(cat, 0)
        total_budget += b
        total_actual += a
        categories.append(BudgetCategory(
            category=cat,
            budget=b,
            actual=a,
            diff=round(b - a),
            progress=round(a / b * 100, 1) if b > 0 else (100 if a > 0 else 0),
        ))

    total_diff = total_budget - total_actual
    savings_rate = round(total_diff / total_budget * 100, 1) if total_budget > 0 else 0

    # 상세 내역
    items = (
        db.query(ActualSpending)
        .filter(ActualSpending.year_month == year_month)
        .order_by(ActualSpending.spend_date.desc(), ActualSpending.created_at.desc())
        .all()
    )

    return BudgetComparison(
        year_month=year_month,
        total_budget=total_budget,
        total_actual=total_actual,
        total_diff=total_diff,
        savings_rate=savings_rate,
        categories=categories,
        spending_items=[ActualSpendingResponse.model_validate(i) for i in items],
    )
