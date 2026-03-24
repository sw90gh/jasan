from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import BigExpense
from app.schemas import BigExpenseCreate, BigExpenseUpdate, BigExpenseResponse

router = APIRouter(prefix="/api/big-expenses", tags=["big-expenses"])


@router.get("/", response_model=list[BigExpenseResponse])
def list_big_expenses(
    include_completed: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(BigExpense)
    if not include_completed:
        query = query.filter(BigExpense.is_completed.is_(False))
    return query.order_by(BigExpense.planned_date).all()


@router.get("/summary")
def big_expense_summary(db: Session = Depends(get_db)):
    """목돈 지출 요약: 월별 합계, 총액, D-day 등"""
    upcoming = (
        db.query(BigExpense)
        .filter(BigExpense.is_completed.is_(False))
        .order_by(BigExpense.planned_date)
        .all()
    )

    total_planned = sum(e.amount for e in upcoming)
    total_saved = sum(e.saved_amount for e in upcoming)
    total_gap = total_planned - total_saved

    # 월별 집계
    monthly: dict[str, float] = {}
    for e in upcoming:
        key = e.planned_date.strftime("%Y-%m")
        monthly[key] = monthly.get(key, 0) + e.amount

    # D-day 계산
    today = date.today()
    items = []
    for e in upcoming:
        days_left = (e.planned_date - today).days
        months_left = max(1, days_left // 30)
        gap = e.amount - e.saved_amount
        monthly_needed = gap / months_left if months_left > 0 and gap > 0 else 0

        items.append({
            "id": e.id,
            "name": e.name,
            "category": e.category,
            "amount": e.amount,
            "saved_amount": e.saved_amount,
            "gap": gap,
            "planned_date": str(e.planned_date),
            "days_left": days_left,
            "progress": round(e.saved_amount / e.amount * 100, 1) if e.amount > 0 else 0,
            "monthly_needed": round(monthly_needed),
            "is_overdue": days_left < 0,
            "memo": e.memo,
        })

    return {
        "total_planned": total_planned,
        "total_saved": total_saved,
        "total_gap": total_gap,
        "count": len(upcoming),
        "monthly_breakdown": monthly,
        "items": items,
    }


@router.post("/", response_model=BigExpenseResponse, status_code=201)
def create_big_expense(data: BigExpenseCreate, db: Session = Depends(get_db)):
    expense = BigExpense(**data.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=BigExpenseResponse)
def update_big_expense(expense_id: int, data: BigExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.get(BigExpense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete_big_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(BigExpense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(expense)
    db.commit()
