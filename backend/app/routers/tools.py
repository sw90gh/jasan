"""Tier 2-3 금융 도구: 대출 갈아타기, 은퇴 플래너, 교육비, 세후수익률, What-if, 투자비교"""
import math
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(prefix="/api/tools", tags=["tools"])


# === 대출 갈아타기 시뮬레이션 ===
class RefinanceInput(BaseModel):
    remaining_balance: float
    current_rate: float  # 현재 금리 (%)
    new_rate: float      # 새 금리 (%)
    remaining_years: int
    refinance_cost: float = 0  # 중도상환수수료, 설정비 등


class RefinanceResult(BaseModel):
    current_monthly: float
    new_monthly: float
    monthly_saving: float
    total_saving: float
    refinance_cost: float
    net_saving: float
    breakeven_months: int | None
    recommendation: str


def _monthly_payment(principal: float, annual_rate: float, years: int) -> float:
    if annual_rate <= 0:
        return principal / (years * 12) if years > 0 else 0
    r = annual_rate / 100 / 12
    n = years * 12
    return principal * r * (1 + r) ** n / ((1 + r) ** n - 1)


@router.post("/refinance", response_model=RefinanceResult)
def refinance_simulation(inp: RefinanceInput):
    cur_monthly = _monthly_payment(inp.remaining_balance, inp.current_rate, inp.remaining_years)
    new_monthly = _monthly_payment(inp.remaining_balance, inp.new_rate, inp.remaining_years)
    monthly_save = cur_monthly - new_monthly
    total_save = monthly_save * inp.remaining_years * 12
    net_save = total_save - inp.refinance_cost

    breakeven = None
    if monthly_save > 0 and inp.refinance_cost > 0:
        breakeven = math.ceil(inp.refinance_cost / monthly_save)

    if net_save > 1_000_000:
        rec = f"갈아타기 추천! 총 {net_save:,.0f}원 절약 가능합니다."
    elif net_save > 0:
        rec = f"소폭 이득({net_save:,.0f}원). 수수료 대비 효과를 확인하세요."
    else:
        rec = "현재 조건이 더 유리하거나 비용 대비 효과가 없습니다."

    return RefinanceResult(
        current_monthly=round(cur_monthly),
        new_monthly=round(new_monthly),
        monthly_saving=round(monthly_save),
        total_saving=round(total_save),
        refinance_cost=inp.refinance_cost,
        net_saving=round(net_save),
        breakeven_months=breakeven,
        recommendation=rec,
    )


# === 은퇴 시나리오 플래너 ===
class RetirementScenario(BaseModel):
    retirement_age: int
    years_until: int
    monthly_living_cost: float  # 은퇴 후 월 생활비
    total_needed: float         # 은퇴 후 필요 총 자금 (30년분)
    projected_assets: float     # 은퇴 시점 예상 자산
    pension_total_monthly: float
    gap_monthly: float          # 연금 제외 월 부족분
    gap_total: float            # 총 부족분
    feasibility: str            # 가능/주의/불가


@router.post("/retirement-scenarios")
def retirement_scenarios(
    current_age: int = 35,
    current_net_worth: float = 0,
    monthly_saving: float = 0,
    annual_return_rate: float = 5.0,
    monthly_living_cost: float = 2_500_000,
    pension_monthly: float = 1_000_000,
    inflation_rate: float = 2.5,
) -> list[RetirementScenario]:
    scenarios = []
    for ret_age in [55, 58, 60, 63, 65]:
        years = max(0, ret_age - current_age)
        post_retirement_years = 30

        # 은퇴 시점 생활비 (물가 반영)
        future_living = monthly_living_cost * ((1 + inflation_rate / 100) ** years)
        total_needed = future_living * 12 * post_retirement_years

        # 은퇴 시점 자산 (복리)
        monthly_rate = annual_return_rate / 100 / 12
        balance = current_net_worth
        for _ in range(years * 12):
            balance = balance * (1 + monthly_rate) + monthly_saving

        # 연금 (물가 반영)
        future_pension = pension_monthly * ((1 + inflation_rate / 100) ** years) * 0.7  # 실질 70% 가정
        pension_total = future_pension * 12 * post_retirement_years

        gap_monthly = max(0, future_living - future_pension)
        gap_total = max(0, total_needed - pension_total - balance)

        if gap_total <= 0:
            feasibility = "가능"
        elif gap_total < total_needed * 0.3:
            feasibility = "주의"
        else:
            feasibility = "불가"

        scenarios.append(RetirementScenario(
            retirement_age=ret_age,
            years_until=years,
            monthly_living_cost=round(future_living),
            total_needed=round(total_needed),
            projected_assets=round(balance),
            pension_total_monthly=round(future_pension),
            gap_monthly=round(gap_monthly),
            gap_total=round(gap_total),
            feasibility=feasibility,
        ))
    return scenarios


# === 자녀 교육비 플래너 ===
@router.get("/education-cost")
def education_cost_planner(
    child_age: int = 3,
    inflation_rate: float = 3.0,
):
    """자녀 교육비 단계별 예상 (물가 반영)"""
    # 2025년 기준 연간 교육비 (평균)
    stages = [
        {"stage": "유치원", "age_start": 4, "age_end": 6, "annual_cost": 4_800_000},
        {"stage": "초등학교", "age_start": 7, "age_end": 12, "annual_cost": 3_600_000},
        {"stage": "중학교", "age_start": 13, "age_end": 15, "annual_cost": 5_400_000},
        {"stage": "고등학교", "age_start": 16, "age_end": 18, "annual_cost": 7_200_000},
        {"stage": "대학교", "age_start": 19, "age_end": 22, "annual_cost": 12_000_000},
    ]

    result = []
    total = 0
    total_inflated = 0

    for s in stages:
        years_until_start = max(0, s["age_start"] - child_age)
        duration = s["age_end"] - s["age_start"] + 1
        nominal_total = s["annual_cost"] * duration

        # 물가 반영
        inflated_total = 0
        for y in range(duration):
            year_offset = years_until_start + y
            inflated_total += s["annual_cost"] * ((1 + inflation_rate / 100) ** year_offset)

        total += nominal_total
        total_inflated += inflated_total

        result.append({
            "stage": s["stage"],
            "age_range": f"{s['age_start']}~{s['age_end']}세",
            "years_until": years_until_start,
            "duration": duration,
            "annual_cost_today": s["annual_cost"],
            "nominal_total": round(nominal_total),
            "inflated_total": round(inflated_total),
            "status": "진행중" if child_age >= s["age_start"] and child_age <= s["age_end"] else ("완료" if child_age > s["age_end"] else "예정"),
        })

    return {
        "child_age": child_age,
        "stages": result,
        "total_nominal": round(total),
        "total_inflated": round(total_inflated),
        "monthly_saving_needed": round(total_inflated / ((22 - child_age) * 12)) if child_age < 22 else 0,
    }


# === 세후 실질수익률 비교 ===
@router.get("/after-tax-return")
def after_tax_return_comparison(
    investment_amount: float = 100_000_000,
    years: int = 10,
    inflation_rate: float = 2.5,
):
    """투자 유형별 세후 실질수익률 비교"""
    products = [
        {"name": "정기예금", "gross_return": 3.5, "tax_rate": 15.4, "type": "interest"},
        {"name": "주식 (국내)", "gross_return": 8.0, "tax_rate": 0, "type": "stock_kr"},  # 소액주주 비과세
        {"name": "주식 (해외ETF)", "gross_return": 10.0, "tax_rate": 22.0, "type": "stock_foreign"},
        {"name": "부동산", "gross_return": 5.0, "tax_rate": 0, "type": "realestate"},  # 1주택 비과세 가정
        {"name": "연금저축", "gross_return": 6.0, "tax_rate": 3.3, "type": "pension"},  # 연금소득세 3.3~5.5%
        {"name": "ISA", "gross_return": 5.0, "tax_rate": 9.9, "type": "isa"},  # 200만 비과세 후 9.9%
        {"name": "채권", "gross_return": 4.0, "tax_rate": 15.4, "type": "bond"},
        {"name": "코인", "gross_return": 15.0, "tax_rate": 22.0, "type": "crypto"},
    ]

    results = []
    for p in products:
        gross = p["gross_return"]
        tax = p["tax_rate"]
        after_tax_return = gross * (1 - tax / 100)
        real_return = after_tax_return - inflation_rate

        final_nominal = investment_amount * ((1 + after_tax_return / 100) ** years)
        final_real = investment_amount * ((1 + real_return / 100) ** years)
        profit_nominal = final_nominal - investment_amount
        profit_real = final_real - investment_amount

        results.append({
            "name": p["name"],
            "gross_return": gross,
            "tax_rate": tax,
            "after_tax_return": round(after_tax_return, 2),
            "real_return": round(real_return, 2),
            "final_nominal": round(final_nominal),
            "final_real": round(final_real),
            "profit_nominal": round(profit_nominal),
            "profit_real": round(profit_real),
        })

    results.sort(key=lambda x: x["real_return"], reverse=True)
    return {"investment_amount": investment_amount, "years": years, "inflation_rate": inflation_rate, "products": results}


# === What-if 시뮬레이터 ===
@router.post("/what-if")
def what_if(
    current_net_worth: float = 0,
    monthly_saving: float = 0,
    annual_return_rate: float = 5.0,
    extra_lump_sum: float = 0,        # 추가 일시 투자/상환
    extra_monthly: float = 0,          # 추가 월 저축
    rate_change: float = 0,            # 수익률 변경 (±%)
    years: int = 10,
):
    """What-if: 변수 조정 시 자산 변화 비교"""
    def project(nw: float, monthly: float, rate: float, n_years: int) -> list[dict]:
        mr = rate / 100 / 12
        bal = nw
        timeline = []
        for y in range(1, n_years + 1):
            for _ in range(12):
                bal = bal * (1 + mr) + monthly
            timeline.append({"year": y, "value": round(bal)})
        return timeline

    # 기본 시나리오
    base = project(current_net_worth, monthly_saving, annual_return_rate, years)

    # What-if 시나리오
    new_nw = current_net_worth + extra_lump_sum
    new_monthly = monthly_saving + extra_monthly
    new_rate = annual_return_rate + rate_change
    whatif = project(new_nw, new_monthly, new_rate, years)

    diff_final = whatif[-1]["value"] - base[-1]["value"] if base and whatif else 0

    return {
        "base_scenario": {"net_worth": current_net_worth, "monthly": monthly_saving, "rate": annual_return_rate, "timeline": base},
        "whatif_scenario": {"net_worth": new_nw, "monthly": new_monthly, "rate": new_rate, "timeline": whatif},
        "diff_final": diff_final,
        "diff_description": f"변경 시 {years}년 후 {diff_final:,.0f}원 {'증가' if diff_final > 0 else '감소'}",
    }


# === 부동산 vs 금융투자 비교 ===
@router.get("/invest-compare")
def invest_compare(
    amount: float = 500_000_000,
    years: int = 10,
    real_estate_return: float = 4.0,
    real_estate_leverage: float = 60.0,  # LTV 60%
    stock_return: float = 8.0,
    deposit_rate: float = 3.5,
    inflation_rate: float = 2.5,
):
    """부동산 vs 주식 vs 예금 수익 비교"""
    results = []

    # 부동산 (레버리지 효과)
    equity = amount
    total_price = equity / (1 - real_estate_leverage / 100) if real_estate_leverage < 100 else equity
    loan = total_price - equity
    loan_rate = 3.5  # 주담대 금리
    annual_loan_cost = loan * loan_rate / 100
    future_value = total_price * ((1 + real_estate_return / 100) ** years)
    re_profit = future_value - total_price - (annual_loan_cost * years)
    re_return = (re_profit / equity) / years * 100

    results.append({
        "name": "부동산 (레버리지)",
        "investment": equity, "total_exposure": round(total_price),
        "final_value": round(future_value), "profit": round(re_profit),
        "annual_return": round(re_return, 1),
        "note": f"LTV {real_estate_leverage}%, 대출이자 연 {annual_loan_cost:,.0f}원",
    })

    # 주식
    stock_final = amount * ((1 + stock_return / 100) ** years)
    stock_profit = stock_final - amount
    results.append({
        "name": "주식/ETF",
        "investment": amount, "total_exposure": amount,
        "final_value": round(stock_final), "profit": round(stock_profit),
        "annual_return": stock_return,
        "note": "소액주주 비과세 가정",
    })

    # 예금
    dep_final = amount * ((1 + deposit_rate * 0.846 / 100) ** years)  # 세후
    dep_profit = dep_final - amount
    results.append({
        "name": "정기예금",
        "investment": amount, "total_exposure": amount,
        "final_value": round(dep_final), "profit": round(dep_profit),
        "annual_return": round(deposit_rate * 0.846, 1),
        "note": "이자소득세 15.4% 반영",
    })

    # 실질가치
    for r in results:
        r["real_profit"] = round(r["profit"] - amount * ((1 + inflation_rate / 100) ** years - 1))

    return {"amount": amount, "years": years, "results": results}
