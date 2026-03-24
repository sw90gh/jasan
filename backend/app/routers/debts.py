from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Debt
from app.schemas import DebtCreate, DebtUpdate, DebtResponse

router = APIRouter(prefix="/api/debts", tags=["debts"])


@router.get("/", response_model=list[DebtResponse])
def list_debts(category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Debt)
    if category:
        query = query.filter(Debt.category == category)
    return query.order_by(Debt.updated_at.desc()).all()


@router.get("/{debt_id}", response_model=DebtResponse)
def get_debt(debt_id: int, db: Session = Depends(get_db)):
    debt = db.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


@router.post("/", response_model=DebtResponse, status_code=201)
def create_debt(data: DebtCreate, db: Session = Depends(get_db)):
    debt = Debt(**data.model_dump())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.put("/{debt_id}", response_model=DebtResponse)
def update_debt(debt_id: int, data: DebtUpdate, db: Session = Depends(get_db)):
    debt = db.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(debt, key, value)
    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}", status_code=204)
def delete_debt(debt_id: int, db: Session = Depends(get_db)):
    debt = db.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    db.delete(debt)
    db.commit()
