import json
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, AssetHistory

router = APIRouter(prefix="/api/history", tags=["history"])


@router.post("/snapshot")
def take_snapshot(db: Session = Depends(get_db)):
    """Take a snapshot of current asset state for history tracking."""
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()

    category_rows = (
        db.query(Asset.category, func.sum(Asset.amount))
        .group_by(Asset.category)
        .all()
    )
    breakdown = {row[0]: row[1] for row in category_rows}

    snapshot = AssetHistory(
        record_date=date.today(),
        total_assets=total_assets,
        total_debts=total_debts,
        net_worth=total_assets - total_debts,
        breakdown=json.dumps(breakdown, ensure_ascii=False),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return {"message": "Snapshot saved", "date": str(snapshot.record_date)}


@router.get("/")
def get_history(months: int = 12, db: Session = Depends(get_db)):
    """Get asset history for chart display."""
    records = (
        db.query(AssetHistory)
        .order_by(AssetHistory.record_date.desc())
        .limit(months)
        .all()
    )
    return [
        {
            "date": str(r.record_date),
            "total_assets": r.total_assets,
            "total_debts": r.total_debts,
            "net_worth": r.net_worth,
            "breakdown": json.loads(r.breakdown) if r.breakdown else {},
        }
        for r in reversed(records)
    ]
