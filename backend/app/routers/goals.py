from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Goal
from app.schemas import GoalCreate, GoalUpdate, GoalResponse

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("/", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db)):
    return db.query(Goal).order_by(Goal.priority, Goal.updated_at.desc()).all()


@router.post("/", response_model=GoalResponse, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(**data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, data: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
