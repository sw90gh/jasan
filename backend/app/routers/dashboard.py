from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Income, Expense
from app.schemas import DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    # Total assets
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()

    # Total debts
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()

    # Assets by category
    category_rows = (
        db.query(Asset.category, func.sum(Asset.amount))
        .group_by(Asset.category)
        .all()
    )
    assets_by_category = {row[0]: row[1] for row in category_rows}

    # Monthly income
    monthly_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(Income.is_monthly.is_(True))
        .scalar()
    )

    # Monthly expenses
    monthly_expense = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(Expense.is_monthly.is_(True))
        .scalar()
    )

    return DashboardSummary(
        total_assets=total_assets,
        total_debts=total_debts,
        net_worth=total_assets - total_debts,
        assets_by_category=assets_by_category,
        monthly_income=monthly_income,
        monthly_expense=monthly_expense,
        monthly_savings=monthly_income - monthly_expense,
    )
