from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Pension
from app.schemas import PensionCreate, PensionUpdate, PensionResponse

router = APIRouter(prefix="/api/pensions", tags=["pensions"])


@router.get("/", response_model=list[PensionResponse])
def list_pensions(db: Session = Depends(get_db)):
    return db.query(Pension).order_by(Pension.updated_at.desc()).all()


@router.post("/", response_model=PensionResponse, status_code=201)
def create_pension(data: PensionCreate, db: Session = Depends(get_db)):
    pension = Pension(**data.model_dump())
    db.add(pension)
    db.commit()
    db.refresh(pension)
    return pension


@router.put("/{pension_id}", response_model=PensionResponse)
def update_pension(pension_id: int, data: PensionUpdate, db: Session = Depends(get_db)):
    pension = db.get(Pension, pension_id)
    if not pension:
        raise HTTPException(status_code=404, detail="Pension not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pension, key, value)
    db.commit()
    db.refresh(pension)
    return pension


@router.delete("/{pension_id}", status_code=204)
def delete_pension(pension_id: int, db: Session = Depends(get_db)):
    pension = db.get(Pension, pension_id)
    if not pension:
        raise HTTPException(status_code=404, detail="Pension not found")
    db.delete(pension)
    db.commit()
