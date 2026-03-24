from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Income
from app.schemas import IncomeCreate, IncomeUpdate, IncomeResponse

router = APIRouter(prefix="/api/incomes", tags=["incomes"])


@router.get("/", response_model=list[IncomeResponse])
def list_incomes(db: Session = Depends(get_db)):
    return db.query(Income).order_by(Income.updated_at.desc()).all()


@router.post("/", response_model=IncomeResponse, status_code=201)
def create_income(data: IncomeCreate, db: Session = Depends(get_db)):
    income = Income(**data.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(income_id: int, data: IncomeUpdate, db: Session = Depends(get_db)):
    income = db.get(Income, income_id)
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(income, key, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=204)
def delete_income(income_id: int, db: Session = Depends(get_db)):
    income = db.get(Income, income_id)
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    db.delete(income)
    db.commit()
