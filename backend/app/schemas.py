from datetime import date, datetime
from pydantic import BaseModel
from app.models import AssetCategory, DebtCategory, PensionType


# --- Asset ---
class AssetCreate(BaseModel):
    category: AssetCategory
    name: str
    institution: str | None = None
    amount: float = 0
    purchase_price: float | None = None
    quantity: float | None = None
    currency: str = "KRW"
    memo: str | None = None


class AssetUpdate(BaseModel):
    category: AssetCategory | None = None
    name: str | None = None
    institution: str | None = None
    amount: float | None = None
    purchase_price: float | None = None
    quantity: float | None = None
    currency: str | None = None
    memo: str | None = None


class AssetResponse(BaseModel):
    id: int
    category: AssetCategory
    name: str
    institution: str | None
    amount: float
    purchase_price: float | None
    quantity: float | None
    currency: str
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Debt ---
class DebtCreate(BaseModel):
    category: DebtCategory
    name: str
    institution: str | None = None
    principal: float = 0
    remaining: float = 0
    interest_rate: float = 0
    monthly_payment: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    memo: str | None = None


class DebtUpdate(BaseModel):
    category: DebtCategory | None = None
    name: str | None = None
    institution: str | None = None
    principal: float | None = None
    remaining: float | None = None
    interest_rate: float | None = None
    monthly_payment: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    memo: str | None = None


class DebtResponse(BaseModel):
    id: int
    category: DebtCategory
    name: str
    institution: str | None
    principal: float
    remaining: float
    interest_rate: float
    monthly_payment: float | None
    start_date: date | None
    end_date: date | None
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Income ---
class IncomeCreate(BaseModel):
    source: str
    amount: float = 0
    is_monthly: bool = True
    memo: str | None = None


class IncomeUpdate(BaseModel):
    source: str | None = None
    amount: float | None = None
    is_monthly: bool | None = None
    memo: str | None = None


class IncomeResponse(BaseModel):
    id: int
    source: str
    amount: float
    is_monthly: bool
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Expense ---
class ExpenseCreate(BaseModel):
    category: str
    name: str
    amount: float = 0
    is_monthly: bool = True
    memo: str | None = None


class ExpenseUpdate(BaseModel):
    category: str | None = None
    name: str | None = None
    amount: float | None = None
    is_monthly: bool | None = None
    memo: str | None = None


class ExpenseResponse(BaseModel):
    id: int
    category: str
    name: str
    amount: float
    is_monthly: bool
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Pension ---
class PensionCreate(BaseModel):
    pension_type: PensionType
    institution: str | None = None
    monthly_contribution: float = 0
    total_accumulated: float = 0
    expected_monthly: float | None = None
    start_date: date | None = None
    memo: str | None = None


class PensionUpdate(BaseModel):
    pension_type: PensionType | None = None
    institution: str | None = None
    monthly_contribution: float | None = None
    total_accumulated: float | None = None
    expected_monthly: float | None = None
    start_date: date | None = None
    memo: str | None = None


class PensionResponse(BaseModel):
    id: int
    pension_type: PensionType
    institution: str | None
    monthly_contribution: float
    total_accumulated: float
    expected_monthly: float | None
    start_date: date | None
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Goal ---
class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: date | None = None
    priority: int = 1
    memo: str | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    target_date: date | None = None
    priority: int | None = None
    memo: str | None = None


class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    target_date: date | None
    priority: int
    memo: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Dashboard ---
class DashboardSummary(BaseModel):
    total_assets: float
    total_debts: float
    net_worth: float
    assets_by_category: dict[str, float]
    monthly_income: float
    monthly_expense: float
    monthly_savings: float
