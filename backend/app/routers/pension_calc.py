from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Pension

router = APIRouter(prefix="/api/pension-calc", tags=["pension-calc"])


class NationalPensionInput(BaseModel):
    """국민연금 예상 수령액 계산 입력"""
    current_age: int = 35
    retirement_age: int = 65
    monthly_income: float = 3000000  # 월 소득 (기준소득월액)
    years_contributed: int = 10  # 현재까지 납부 기간 (년)


class NationalPensionResult(BaseModel):
    total_contribution_years: int  # 총 예상 가입 기간
    monthly_pension_estimate: float  # 예상 월 수령액
    start_age: int  # 수령 시작 나이
    yearly_pension: float
    total_contributed: float  # 총 납부 예상액
    replacement_rate: float  # 소득대체율 (%)


class RetirementPensionInput(BaseModel):
    """퇴직연금 추정 입력"""
    current_balance: float = 0  # 현재 적립금
    monthly_contribution: float = 0  # 월 납입액
    annual_return_rate: float = 4.0  # 연 수익률
    years_until_retirement: int = 30


class RetirementPensionResult(BaseModel):
    final_balance: float
    total_contributed: float
    total_return: float
    monthly_pension_20yr: float  # 20년 분할 수령 시 월 수령액
    monthly_pension_30yr: float  # 30년 분할 수령 시 월 수령액


class PersonalPensionInput(BaseModel):
    """개인연금 추정 입력"""
    current_balance: float = 0
    monthly_contribution: float = 0
    annual_return_rate: float = 5.0
    years_until_retirement: int = 30
    tax_deduction_rate: float = 16.5  # 세액공제율 (%)


class PersonalPensionResult(BaseModel):
    final_balance: float
    total_contributed: float
    total_return: float
    annual_tax_benefit: float  # 연 세액공제 금액
    total_tax_benefit: float
    monthly_pension_20yr: float
    monthly_pension_30yr: float


class TotalPensionSummary(BaseModel):
    national: NationalPensionResult | None
    retirement: RetirementPensionResult | None
    personal: PersonalPensionResult | None
    total_monthly_pension: float  # 합산 예상 월 수령액
    income_replacement_rate: float  # 소득대체율
    pension_gap: float  # 적정 생활비 대비 부족분
    recommended_additional_saving: float


# 2025년 기준 국민연금 계산 (간이 공식)
# 기본연금액 = 2.4 * (A + B) * (1 + 0.05*n) / 12
# A: 전체 가입자 평균소득월액 (약 286만원, 2024 기준)
# B: 본인 기준소득월액
# n: 20년 초과 가입 기간
NATIONAL_AVG_INCOME = 2860000  # A값 (전체 가입자 평균)
NATIONAL_PENSION_RATE = 0.09  # 보험료율 9%


@router.post("/national", response_model=NationalPensionResult)
def calc_national_pension(inp: NationalPensionInput):
    remaining_years = max(0, inp.retirement_age - inp.current_age)
    total_years = inp.years_contributed + remaining_years

    # 기본연금액 간이 계산 (2025년 기준)
    a_val = NATIONAL_AVG_INCOME
    b_val = min(inp.monthly_income, 5900000)  # 상한액 590만원

    # 기본 소득대체율: 가입 20년 기준 약 25%, 1년 추가시 +5%p 비례
    base_rate = 1.2  # 기본 계수
    if total_years <= 0:
        monthly_estimate = 0
    else:
        # 간이공식: 기본연금액 = base_rate * (A+B) * N / 12
        # N = 가입연수 (최대 상한 있음)
        monthly_estimate = base_rate * (a_val + b_val) * total_years / 12
        # 상한 적용 (대략 최대 200만원 수준)
        monthly_estimate = min(monthly_estimate, 2500000)

    total_contributed = inp.monthly_income * NATIONAL_PENSION_RATE * total_years * 12
    replacement = (monthly_estimate / inp.monthly_income * 100) if inp.monthly_income > 0 else 0

    return NationalPensionResult(
        total_contribution_years=total_years,
        monthly_pension_estimate=round(monthly_estimate),
        start_age=inp.retirement_age,
        yearly_pension=round(monthly_estimate * 12),
        total_contributed=round(total_contributed),
        replacement_rate=round(replacement, 1),
    )


@router.post("/retirement", response_model=RetirementPensionResult)
def calc_retirement_pension(inp: RetirementPensionInput):
    monthly_rate = inp.annual_return_rate / 100 / 12
    months = inp.years_until_retirement * 12

    balance = inp.current_balance
    total_contrib = inp.current_balance
    for _ in range(months):
        balance = balance * (1 + monthly_rate) + inp.monthly_contribution
        total_contrib += inp.monthly_contribution

    total_return = balance - total_contrib

    return RetirementPensionResult(
        final_balance=round(balance),
        total_contributed=round(total_contrib),
        total_return=round(total_return),
        monthly_pension_20yr=round(balance / (20 * 12)),
        monthly_pension_30yr=round(balance / (30 * 12)),
    )


@router.post("/personal", response_model=PersonalPensionResult)
def calc_personal_pension(inp: PersonalPensionInput):
    monthly_rate = inp.annual_return_rate / 100 / 12
    months = inp.years_until_retirement * 12

    balance = inp.current_balance
    total_contrib = inp.current_balance
    for _ in range(months):
        balance = balance * (1 + monthly_rate) + inp.monthly_contribution
        total_contrib += inp.monthly_contribution

    total_return = balance - total_contrib

    # 세액공제: 연 최대 900만원 (연금저축 600 + IRP 300)
    annual_contrib = inp.monthly_contribution * 12
    deductible = min(annual_contrib, 9000000)
    annual_tax_benefit = deductible * inp.tax_deduction_rate / 100
    total_tax_benefit = annual_tax_benefit * inp.years_until_retirement

    return PersonalPensionResult(
        final_balance=round(balance),
        total_contributed=round(total_contrib),
        total_return=round(total_return),
        annual_tax_benefit=round(annual_tax_benefit),
        total_tax_benefit=round(total_tax_benefit),
        monthly_pension_20yr=round(balance / (20 * 12)),
        monthly_pension_30yr=round(balance / (30 * 12)),
    )


@router.get("/summary", response_model=TotalPensionSummary)
def pension_summary(
    current_age: int = 35,
    retirement_age: int = 65,
    monthly_income: float = 3000000,
    target_monthly_living: float = 2500000,
    db: Session = Depends(get_db),
):
    """DB에 저장된 연금 정보 기반 통합 추정"""
    pensions = db.query(Pension).all()
    years_left = max(0, retirement_age - current_age)

    national_result = None
    retirement_result = None
    personal_result = None
    total_monthly = 0

    for p in pensions:
        if p.pension_type == "national":
            res = calc_national_pension(NationalPensionInput(
                current_age=current_age,
                retirement_age=retirement_age,
                monthly_income=monthly_income,
                years_contributed=max(1, current_age - 18),
            ))
            national_result = res
            total_monthly += res.monthly_pension_estimate

        elif p.pension_type == "retirement":
            res = calc_retirement_pension(RetirementPensionInput(
                current_balance=p.total_accumulated,
                monthly_contribution=p.monthly_contribution,
                annual_return_rate=4.0,
                years_until_retirement=years_left,
            ))
            retirement_result = res
            total_monthly += res.monthly_pension_20yr

        elif p.pension_type == "personal":
            res = calc_personal_pension(PersonalPensionInput(
                current_balance=p.total_accumulated,
                monthly_contribution=p.monthly_contribution,
                annual_return_rate=5.0,
                years_until_retirement=years_left,
            ))
            personal_result = res
            total_monthly += res.monthly_pension_20yr

    replacement = (total_monthly / monthly_income * 100) if monthly_income > 0 else 0
    gap = max(0, target_monthly_living - total_monthly)

    # 부족분을 개인저축으로 채우려면 월 얼마 필요한지
    if gap > 0 and years_left > 0:
        # 20년 수령 기준, 연 4% 수익
        target_fund = gap * 20 * 12
        monthly_rate = 0.04 / 12
        n = years_left * 12
        fv_factor = (1 + monthly_rate) ** n
        annuity = (fv_factor - 1) / monthly_rate
        recommended = target_fund / annuity if annuity > 0 else 0
    else:
        recommended = 0

    return TotalPensionSummary(
        national=national_result,
        retirement=retirement_result,
        personal=personal_result,
        total_monthly_pension=round(total_monthly),
        income_replacement_rate=round(replacement, 1),
        pension_gap=round(gap),
        recommended_additional_saving=round(recommended),
    )
