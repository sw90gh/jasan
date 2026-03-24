from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Income, Expense, Goal, BigExpense, Pension
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


@router.get("/treemap")
def get_treemap_data(db: Session = Depends(get_db)):
    """트리맵용 자산 상세 데이터 (개별 항목 포함)"""
    assets = db.query(Asset).all()
    CAT_KR = {"real_estate": "부동산", "deposit": "예적금", "stock": "주식", "fund": "펀드/ETF", "crypto": "암호화폐", "insurance": "보험", "pension": "연금", "cash": "현금", "other": "기타"}
    CAT_COLORS = {"real_estate": "#3b82f6", "deposit": "#10b981", "stock": "#f59e0b", "fund": "#8b5cf6", "crypto": "#ef4444", "insurance": "#06b6d4", "pension": "#ec4899", "cash": "#6b7280", "other": "#a3a3a3"}

    # 카테고리별 그룹핑
    groups: dict[str, list] = {}
    for a in assets:
        cat = a.category.value if hasattr(a.category, 'value') else a.category
        if cat not in groups:
            groups[cat] = []
        pnl = None
        if a.purchase_price and a.purchase_price > 0:
            pnl = round((a.amount / a.purchase_price - 1) * 100, 1)
        groups[cat].append({
            "name": a.name,
            "value": a.amount,
            "institution": a.institution,
            "pnl": pnl,
        })

    treemap = []
    for cat, items in groups.items():
        cat_total = sum(i["value"] for i in items)
        treemap.append({
            "name": CAT_KR.get(cat, cat),
            "category": cat,
            "value": cat_total,
            "color": CAT_COLORS.get(cat, "#999"),
            "children": items,
        })

    treemap.sort(key=lambda x: x["value"], reverse=True)
    return treemap


@router.get("/expense-breakdown")
def get_expense_breakdown(db: Session = Depends(get_db)):
    """지출 카테고리별 상세 (워터폴 차트용)"""
    rows = (
        db.query(Expense.category, func.sum(Expense.amount))
        .filter(Expense.is_monthly.is_(True))
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )
    total = sum(r[1] for r in rows)
    result = []
    cumulative = 0
    for cat, amount in rows:
        result.append({
            "category": cat,
            "amount": amount,
            "percentage": round(amount / total * 100, 1) if total > 0 else 0,
            "cumulative": cumulative,
        })
        cumulative += amount

    return {"total": total, "items": result}


@router.get("/debt-breakdown")
def get_debt_breakdown(db: Session = Depends(get_db)):
    """부채 상세 (상환 진행률 포함)"""
    debts = db.query(Debt).all()
    DEBT_KR = {"mortgage": "주택담보", "credit": "신용", "student": "학자금", "car": "자동차", "other": "기타"}
    result = []
    for d in debts:
        cat = d.category.value if hasattr(d.category, 'value') else d.category
        paid = d.principal - d.remaining
        progress = round(paid / d.principal * 100, 1) if d.principal > 0 else 0
        result.append({
            "name": d.name,
            "category": DEBT_KR.get(cat, cat),
            "principal": d.principal,
            "remaining": d.remaining,
            "paid": paid,
            "progress": progress,
            "interest_rate": d.interest_rate,
            "monthly_payment": d.monthly_payment,
        })
    return result


@router.get("/goals-progress")
def get_goals_progress(db: Session = Depends(get_db)):
    """목표 진행률 (대시보드 게이지용)"""
    from datetime import date
    goals = db.query(Goal).order_by(Goal.priority).all()
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()
    net_worth = total_assets - total_debts

    result = []
    for g in goals:
        progress = min(100, round(net_worth / g.target_amount * 100, 1)) if g.target_amount > 0 else 0
        days_left = (g.target_date - date.today()).days if g.target_date else None
        result.append({
            "name": g.name,
            "target": g.target_amount,
            "current": net_worth,
            "progress": progress,
            "priority": g.priority,
            "days_left": days_left,
        })
    return result


@router.get("/upcoming-expenses")
def get_upcoming_expenses(db: Session = Depends(get_db)):
    """다가오는 목돈 지출 (90일 이내)"""
    from datetime import date, timedelta
    today = date.today()
    cutoff = today + timedelta(days=90)
    items = (
        db.query(BigExpense)
        .filter(BigExpense.is_completed.is_(False), BigExpense.planned_date <= cutoff)
        .order_by(BigExpense.planned_date)
        .all()
    )
    return [{
        "name": e.name,
        "category": e.category,
        "amount": e.amount,
        "saved_amount": e.saved_amount,
        "planned_date": str(e.planned_date),
        "days_left": (e.planned_date - today).days,
        "progress": round(e.saved_amount / e.amount * 100, 1) if e.amount > 0 else 0,
    } for e in items]
