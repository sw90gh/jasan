from datetime import datetime, date
from sqlalchemy import String, Float, Integer, Date, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database import Base


class AssetCategory(str, enum.Enum):
    REAL_ESTATE = "real_estate"       # 부동산
    DEPOSIT = "deposit"               # 예적금
    STOCK = "stock"                   # 주식
    FUND = "fund"                     # 펀드/ETF
    CRYPTO = "crypto"                 # 암호화폐
    INSURANCE = "insurance"           # 보험
    PENSION = "pension"               # 연금
    CASH = "cash"                     # 현금
    OTHER = "other"                   # 기타


class DebtCategory(str, enum.Enum):
    MORTGAGE = "mortgage"             # 주택담보대출
    CREDIT = "credit"                 # 신용대출
    STUDENT = "student"               # 학자금대출
    CAR = "car"                       # 자동차대출
    OTHER = "other"                   # 기타


class PensionType(str, enum.Enum):
    NATIONAL = "national"             # 국민연금
    RETIREMENT = "retirement"         # 퇴직연금
    PERSONAL = "personal"             # 개인연금


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(SAEnum(AssetCategory), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(100))  # 금융기관
    amount: Mapped[float] = mapped_column(Float, default=0)       # 현재 평가액
    purchase_price: Mapped[float | None] = mapped_column(Float)   # 매입가/투자원금
    quantity: Mapped[float | None] = mapped_column(Float)         # 수량 (주식 등)
    currency: Mapped[str] = mapped_column(String(10), default="KRW")
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(SAEnum(DebtCategory), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(100))
    principal: Mapped[float] = mapped_column(Float, default=0)      # 원금
    remaining: Mapped[float] = mapped_column(Float, default=0)      # 잔액
    interest_rate: Mapped[float] = mapped_column(Float, default=0)  # 금리 (%)
    monthly_payment: Mapped[float | None] = mapped_column(Float)    # 월 상환액
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class AssetHistory(Base):
    __tablename__ = "asset_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_assets: Mapped[float] = mapped_column(Float, default=0)
    total_debts: Mapped[float] = mapped_column(Float, default=0)
    net_worth: Mapped[float] = mapped_column(Float, default=0)
    breakdown: Mapped[str | None] = mapped_column(Text)  # JSON: 카테고리별 합계
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Income(Base):
    __tablename__ = "incomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # 급여, 사업, 임대 등
    amount: Mapped[float] = mapped_column(Float, default=0)
    is_monthly: Mapped[bool] = mapped_column(default=True)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # 주거, 식비, 교통 등
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0)
    is_monthly: Mapped[bool] = mapped_column(default=True)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class Pension(Base):
    __tablename__ = "pensions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pension_type: Mapped[str] = mapped_column(SAEnum(PensionType), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(100))
    monthly_contribution: Mapped[float] = mapped_column(Float, default=0)  # 월 납입액
    total_accumulated: Mapped[float] = mapped_column(Float, default=0)     # 누적액
    expected_monthly: Mapped[float | None] = mapped_column(Float)          # 예상 월 수령액
    start_date: Mapped[date | None] = mapped_column(Date)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class BigExpense(Base):
    """목돈 지출 계획 (미래 예정된 큰 지출)"""
    __tablename__ = "big_expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # 의료, 교육, 경조사, 여행, 자동차, 주거, 기타
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    saved_amount: Mapped[float] = mapped_column(Float, default=0)  # 현재까지 준비한 금액
    is_completed: Mapped[bool] = mapped_column(default=False)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class ActualSpending(Base):
    """월별 실제 지출 기록"""
    __tablename__ = "actual_spending"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year_month: Mapped[str] = mapped_column(String(7), nullable=False)  # "2026-03"
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    spend_date: Mapped[date | None] = mapped_column(Date)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1=높음, 2=중간, 3=낮음
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
