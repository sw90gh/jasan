from pydantic import BaseModel
from fastapi import APIRouter

from app.tax_data import (
    GIFT_TAX_EXEMPTION, GIFT_TAX_BRACKETS,
    CAPITAL_GAINS_TAX_BRACKETS, ONE_HOUSE_EXEMPTION, MULTI_HOUSE_SURCHARGE,
    LONG_TERM_DEDUCTION_RATES,
    INCOME_TAX_BRACKETS, FINANCIAL_INCOME_THRESHOLD, FINANCIAL_INCOME_SEPARATE_RATE,
    INHERITANCE_TAX_BRACKETS, INHERITANCE_DEDUCTIONS,
    TAX_SAVING_LIMITS,
)

router = APIRouter(prefix="/api/tax", tags=["tax"])


def _calc_progressive_tax(taxable: float, brackets: list) -> tuple[float, float]:
    """누진세 계산 → (세금, 실효세율%)"""
    if taxable <= 0:
        return 0, 0
    for limit, rate, deduction in brackets:
        if taxable <= limit:
            tax = taxable * rate - deduction
            effective = tax / taxable * 100 if taxable > 0 else 0
            return round(tax), round(effective, 1)
    return 0, 0


# === 증여세 ===
class GiftTaxInput(BaseModel):
    gift_amount: float
    relationship: str = "adult_child"  # spouse, adult_child, minor_child, parent, other_relative, non_relative
    previous_gifts_10yr: float = 0  # 10년 내 기증여액


class GiftTaxResult(BaseModel):
    gift_amount: float
    exemption: float
    taxable: float
    tax: float
    effective_rate: float
    relationship_label: str
    tip: str


RELATIONSHIP_LABELS = {
    "spouse": "배우자",
    "adult_child": "성년 자녀",
    "minor_child": "미성년 자녀",
    "parent": "부모",
    "other_relative": "기타 친족",
    "non_relative": "타인",
}


@router.post("/gift", response_model=GiftTaxResult)
def calc_gift_tax(inp: GiftTaxInput):
    exemption = GIFT_TAX_EXEMPTION.get(inp.relationship, 0)
    total_gift = inp.gift_amount + inp.previous_gifts_10yr
    taxable = max(0, total_gift - exemption)
    tax, eff_rate = _calc_progressive_tax(taxable, GIFT_TAX_BRACKETS)

    # 기신고 세액 차감 (이전 증여분에 대한 세금)
    if inp.previous_gifts_10yr > 0:
        prev_taxable = max(0, inp.previous_gifts_10yr - exemption)
        prev_tax, _ = _calc_progressive_tax(prev_taxable, GIFT_TAX_BRACKETS)
        tax = max(0, tax - prev_tax)
        eff_rate = round(tax / inp.gift_amount * 100, 1) if inp.gift_amount > 0 else 0

    tip = ""
    if inp.relationship in ("adult_child", "minor_child"):
        tip = f"10년 주기로 {GIFT_TAX_EXEMPTION[inp.relationship]//10000}만원까지 비과세. 분할 증여가 유리합니다."
    elif inp.relationship == "spouse":
        tip = "배우자에게는 10년간 6억까지 비과세입니다."

    return GiftTaxResult(
        gift_amount=inp.gift_amount,
        exemption=exemption,
        taxable=taxable,
        tax=tax,
        effective_rate=eff_rate,
        relationship_label=RELATIONSHIP_LABELS.get(inp.relationship, inp.relationship),
        tip=tip,
    )


# === 양도소득세 ===
class CapitalGainsTaxInput(BaseModel):
    sale_price: float           # 매도가
    purchase_price: float       # 매수가
    holding_years: int = 1      # 보유 기간 (년)
    is_one_house: bool = True   # 1세대 1주택 여부
    num_houses: int = 1         # 보유 주택 수
    is_regulated_area: bool = False  # 조정대상지역 여부
    expenses: float = 0         # 필요경비 (취득세, 중개비 등)


class CapitalGainsTaxResult(BaseModel):
    gain: float
    taxable_gain: float
    long_term_deduction: float
    basic_deduction: float
    tax: float
    effective_rate: float
    is_exempt: bool
    details: str


@router.post("/capital-gains", response_model=CapitalGainsTaxResult)
def calc_capital_gains_tax(inp: CapitalGainsTaxInput):
    gain = inp.sale_price - inp.purchase_price - inp.expenses

    # 1세대 1주택 비과세 체크
    if inp.is_one_house and inp.holding_years >= ONE_HOUSE_EXEMPTION["min_holding_years"]:
        if inp.sale_price <= ONE_HOUSE_EXEMPTION["max_exemption"]:
            return CapitalGainsTaxResult(
                gain=gain, taxable_gain=0, long_term_deduction=0,
                basic_deduction=0, tax=0, effective_rate=0,
                is_exempt=True,
                details=f"1세대 1주택 비과세 (보유 {inp.holding_years}년, 매도가 12억 이하)"
            )
        else:
            # 12억 초과분만 과세
            excess_ratio = (inp.sale_price - ONE_HOUSE_EXEMPTION["max_exemption"]) / inp.sale_price
            gain = gain * excess_ratio

    # 장기보유특별공제
    lt_rate = 0
    if inp.is_one_house and inp.holding_years >= 3:
        for years, rate in sorted(LONG_TERM_DEDUCTION_RATES.items()):
            if inp.holding_years >= years:
                lt_rate = rate
    elif not inp.is_one_house and inp.holding_years >= 3:
        lt_rate = min(0.30, inp.holding_years * 0.02)  # 일반: 연 2%, 최대 30%

    long_term_ded = gain * lt_rate
    taxable = gain - long_term_ded
    basic_ded = 2500000  # 기본공제 250만원
    taxable = max(0, taxable - basic_ded)

    # 다주택 중과
    if inp.num_houses >= 2 and inp.is_regulated_area:
        surcharge = MULTI_HOUSE_SURCHARGE.get(min(inp.num_houses, 3), 0.30)
        tax = taxable * (0.45 + surcharge)  # 최고세율 + 중과
        eff_rate = round(tax / gain * 100, 1) if gain > 0 else 0
        details = f"다주택({inp.num_houses}주택) 중과 적용 (+{int(surcharge*100)}%p)"
    else:
        tax, eff_rate = _calc_progressive_tax(taxable, CAPITAL_GAINS_TAX_BRACKETS)
        details = f"보유 {inp.holding_years}년, 장기보유공제 {int(lt_rate*100)}%"

    return CapitalGainsTaxResult(
        gain=round(gain),
        taxable_gain=round(taxable),
        long_term_deduction=round(long_term_ded),
        basic_deduction=basic_ded,
        tax=round(tax),
        effective_rate=eff_rate,
        is_exempt=False,
        details=details,
    )


# === 종합소득세 / 금융소득 ===
class IncomeTaxInput(BaseModel):
    salary_income: float = 0       # 근로소득
    business_income: float = 0     # 사업소득
    rental_income: float = 0       # 임대소득
    financial_income: float = 0    # 금융소득 (이자+배당)
    pension_income: float = 0      # 연금소득
    deductions: float = 0          # 소득공제 합계


class IncomeTaxResult(BaseModel):
    total_income: float
    taxable_income: float
    income_tax: float
    local_tax: float  # 지방소득세 10%
    total_tax: float
    effective_rate: float
    financial_income_note: str
    tips: list[str]


@router.post("/income", response_model=IncomeTaxResult)
def calc_income_tax(inp: IncomeTaxInput):
    tips = []

    # 금융소득 처리
    fin_note = ""
    if inp.financial_income > FINANCIAL_INCOME_THRESHOLD:
        fin_note = f"금융소득 {round(inp.financial_income/10000)}만원 > 2,000만원 → 종합과세 대상"
        tips.append("금융소득이 2,000만원을 초과하여 종합과세됩니다. ISA 활용을 고려하세요.")
        financial_taxable = inp.financial_income
    else:
        fin_note = f"금융소득 {round(inp.financial_income/10000)}만원 ≤ 2,000만원 → 분리과세 (15.4%)"
        financial_taxable = 0  # 분리과세이므로 종합소득에 미포함

    total = inp.salary_income + inp.business_income + inp.rental_income + financial_taxable + inp.pension_income
    taxable = max(0, total - inp.deductions)

    income_tax, eff_rate = _calc_progressive_tax(taxable, INCOME_TAX_BRACKETS)
    local_tax = round(income_tax * 0.1)

    # 분리과세 금융소득 세금
    if inp.financial_income > 0 and inp.financial_income <= FINANCIAL_INCOME_THRESHOLD:
        separate_tax = round(inp.financial_income * FINANCIAL_INCOME_SEPARATE_RATE)
        income_tax += separate_tax

    total_tax = income_tax + local_tax

    # 절세 팁
    if inp.pension_income > 12000000:
        tips.append("연금소득이 연 1,200만원 초과 시 종합과세 또는 16.5% 분리과세 중 유리한 것을 선택하세요.")
    if inp.rental_income > 0:
        tips.append("주택임대소득 연 2,000만원 이하는 분리과세(14%) 선택 가능합니다.")

    return IncomeTaxResult(
        total_income=total,
        taxable_income=taxable,
        income_tax=income_tax,
        local_tax=local_tax,
        total_tax=total_tax,
        effective_rate=round(total_tax / total * 100, 1) if total > 0 else 0,
        financial_income_note=fin_note,
        tips=tips,
    )


# === 절세 전략 제안 ===
class TaxSavingAdvice(BaseModel):
    strategies: list[dict]
    total_potential_saving: float


@router.get("/saving-advice", response_model=TaxSavingAdvice)
def get_tax_saving_advice(
    annual_income: float = 50000000,
    has_pension_saving: bool = False,
    has_irp: bool = False,
    has_isa: bool = False,
):
    strategies = []
    total_saving = 0

    # 총급여 5,500만원 이하: 16.5%, 초과: 13.2%
    deduction_rate = 0.165 if annual_income <= 55000000 else 0.132

    if not has_pension_saving:
        benefit = TAX_SAVING_LIMITS["pension_saving_annual"] * deduction_rate
        strategies.append({
            "name": "연금저축 가입",
            "description": f"연 최대 {TAX_SAVING_LIMITS['pension_saving_annual']//10000}만원 납입 시 세액공제 {round(benefit)}원 ({deduction_rate*100}%)",
            "annual_benefit": round(benefit),
            "priority": "높음",
        })
        total_saving += benefit

    if not has_irp:
        irp_extra = TAX_SAVING_LIMITS["irp_annual"] - TAX_SAVING_LIMITS["pension_saving_annual"]
        benefit = irp_extra * deduction_rate
        strategies.append({
            "name": "IRP 추가 납입",
            "description": f"연금저축 외 IRP에 추가 {irp_extra//10000}만원 납입 시 세액공제 {round(benefit)}원",
            "annual_benefit": round(benefit),
            "priority": "높음",
        })
        total_saving += benefit

    if not has_isa:
        strategies.append({
            "name": "ISA 계좌 활용",
            "description": f"연 {TAX_SAVING_LIMITS['isa_annual']//10000}만원 납입, 수익 {TAX_SAVING_LIMITS['isa_tax_free']//10000}만원까지 비과세, 초과분 9.9% 분리과세",
            "annual_benefit": 0,
            "priority": "중간",
        })

    strategies.append({
        "name": "증여 분할 전략",
        "description": "자녀에게 10년 주기 5,000만원(미성년 2,000만원)까지 비과세 증여 가능",
        "annual_benefit": 0,
        "priority": "장기",
    })

    strategies.append({
        "name": "주택청약종합저축",
        "description": "연 최대 300만원 소득공제 (총급여 7천만원 이하 무주택자)",
        "annual_benefit": round(3000000 * 0.40) if annual_income <= 70000000 else 0,
        "priority": "중간" if annual_income <= 70000000 else "해당없음",
    })

    return TaxSavingAdvice(
        strategies=strategies,
        total_potential_saving=round(total_saving),
    )
