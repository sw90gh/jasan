"""
AI 재무 제안 엔진
- 포트폴리오 분석 및 리밸런싱 제안
- 정부 정책 활용 가이드
- 월간/분기 재무 리포트 생성
"""
import json
from datetime import date, datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Asset, Debt, Income, Expense, Pension, Goal, AssetHistory

router = APIRouter(prefix="/api/advisor", tags=["advisor"])


class PortfolioAdvice(BaseModel):
    current_allocation: dict[str, float]  # 카테고리별 비율
    recommended_allocation: dict[str, float]
    rebalancing_actions: list[dict]
    risk_score: int  # 1~10
    risk_label: str


class PolicyGuide(BaseModel):
    applicable_policies: list[dict]
    total_potential_benefit: float


class MonthlyReport(BaseModel):
    report_date: str
    summary: dict
    highlights: list[str]
    warnings: list[str]
    recommendations: list[str]
    asset_change: dict
    income_expense: dict
    goal_progress: list[dict]


# 권장 자산 배분 (나이대별)
RECOMMENDED_ALLOCATIONS = {
    "20s": {"stock": 0.50, "fund": 0.20, "deposit": 0.15, "crypto": 0.05, "pension": 0.10},
    "30s": {"stock": 0.40, "fund": 0.20, "real_estate": 0.10, "deposit": 0.15, "pension": 0.15},
    "40s": {"stock": 0.30, "fund": 0.15, "real_estate": 0.20, "deposit": 0.20, "pension": 0.15},
    "50s": {"stock": 0.20, "fund": 0.10, "real_estate": 0.25, "deposit": 0.25, "pension": 0.20},
    "60s": {"stock": 0.10, "fund": 0.05, "real_estate": 0.25, "deposit": 0.35, "pension": 0.25},
}

# 정부 정책 DB (2025년 기준)
GOVERNMENT_POLICIES = [
    {
        "name": "청년도약계좌",
        "condition": "만 19~34세, 총급여 7,500만원 이하",
        "benefit": "월 최대 70만원 납입, 정부 기여금 + 비과세",
        "max_benefit": 5040000,
        "target": "youth",
    },
    {
        "name": "청약종합저축",
        "condition": "무주택 세대주",
        "benefit": "연 300만원 소득공제 (총급여 7천만원 이하), 주택 청약 자격",
        "max_benefit": 1200000,
        "target": "no_house",
    },
    {
        "name": "연금저축 세액공제",
        "condition": "근로/사업소득자",
        "benefit": "연 600만원 한도, 세액공제 13.2~16.5%",
        "max_benefit": 990000,
        "target": "all",
    },
    {
        "name": "IRP 세액공제",
        "condition": "근로/사업소득자",
        "benefit": "연금저축 포함 900만원 한도, 세액공제 13.2~16.5%",
        "max_benefit": 1485000,
        "target": "all",
    },
    {
        "name": "ISA (개인종합자산관리계좌)",
        "condition": "만 19세 이상 거주자",
        "benefit": "수익 200만원(서민형 400만원) 비과세, 초과분 9.9% 분리과세",
        "max_benefit": 400000,
        "target": "all",
    },
    {
        "name": "주택임대소득 분리과세",
        "condition": "주택임대소득 연 2,000만원 이하",
        "benefit": "14% 분리과세 선택 가능 (종합과세보다 유리할 수 있음)",
        "max_benefit": 0,
        "target": "landlord",
    },
    {
        "name": "장기주택저당차입금 이자공제",
        "condition": "무주택/1주택 세대주, 취득가 5억 이하",
        "benefit": "이자상환액 연 최대 1,500~1,800만원 소득공제",
        "max_benefit": 7200000,
        "target": "mortgage_holder",
    },
    {
        "name": "월세 세액공제",
        "condition": "총급여 7천만원 이하 무주택 세대주",
        "benefit": "월세 납부액 연 750만원 한도, 15~17% 세액공제",
        "max_benefit": 1275000,
        "target": "renter",
    },
    {
        "name": "자녀 증여 비과세",
        "condition": "증여 시",
        "benefit": "성년 자녀 10년간 5,000만원, 미성년 2,000만원 비과세",
        "max_benefit": 0,
        "target": "parent",
    },
]


@router.get("/portfolio", response_model=PortfolioAdvice)
def analyze_portfolio(age_group: str = "30s", db: Session = Depends(get_db)):
    """포트폴리오 분석 및 리밸런싱 제안"""
    total = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    if total == 0:
        return PortfolioAdvice(
            current_allocation={},
            recommended_allocation=RECOMMENDED_ALLOCATIONS.get(age_group, RECOMMENDED_ALLOCATIONS["30s"]),
            rebalancing_actions=[{"action": "자산을 먼저 등록해주세요."}],
            risk_score=0,
            risk_label="데이터 없음",
        )

    # 현재 배분
    rows = db.query(Asset.category, func.sum(Asset.amount)).group_by(Asset.category).all()
    current = {row[0]: round(row[1] / total, 4) for row in rows}

    recommended = RECOMMENDED_ALLOCATIONS.get(age_group, RECOMMENDED_ALLOCATIONS["30s"])

    # 리밸런싱 액션 생성
    actions = []
    for cat, rec_ratio in recommended.items():
        cur_ratio = current.get(cat, 0)
        diff = rec_ratio - cur_ratio
        if abs(diff) > 0.05:  # 5% 이상 차이나면 제안
            amount_diff = round(diff * total)
            if diff > 0:
                actions.append({
                    "category": cat,
                    "action": "증가",
                    "current_ratio": round(cur_ratio * 100, 1),
                    "target_ratio": round(rec_ratio * 100, 1),
                    "amount": abs(amount_diff),
                    "description": f"{cat} 비중을 {round(cur_ratio*100,1)}% → {round(rec_ratio*100,1)}%로 증가 (약 {abs(amount_diff):,}원 추가 투자)",
                })
            else:
                actions.append({
                    "category": cat,
                    "action": "감소",
                    "current_ratio": round(cur_ratio * 100, 1),
                    "target_ratio": round(rec_ratio * 100, 1),
                    "amount": abs(amount_diff),
                    "description": f"{cat} 비중을 {round(cur_ratio*100,1)}% → {round(rec_ratio*100,1)}%로 감소",
                })

    # 리스크 점수 (주식+코인 비율 기반)
    risky = current.get("stock", 0) + current.get("crypto", 0)
    risk_score = min(10, max(1, round(risky * 12)))
    risk_labels = {
        range(1, 3): "안정형",
        range(3, 5): "안정추구형",
        range(5, 7): "위험중립형",
        range(7, 9): "적극투자형",
        range(9, 11): "공격투자형",
    }
    risk_label = "위험중립형"
    for r, label in risk_labels.items():
        if risk_score in r:
            risk_label = label
            break

    if not actions:
        actions.append({"action": "현재 포트폴리오가 권장 배분에 근접합니다. 유지하세요."})

    return PortfolioAdvice(
        current_allocation={k: round(v * 100, 1) for k, v in current.items()},
        recommended_allocation={k: round(v * 100, 1) for k, v in recommended.items()},
        rebalancing_actions=actions,
        risk_score=risk_score,
        risk_label=risk_label,
    )


@router.get("/policies", response_model=PolicyGuide)
def get_policy_guide(
    age: int = 35,
    annual_income: float = 50000000,
    has_house: bool = False,
    has_pension_saving: bool = False,
    has_isa: bool = False,
):
    """활용 가능한 정부 정책 가이드"""
    applicable = []
    total_benefit = 0

    for policy in GOVERNMENT_POLICIES:
        target = policy["target"]
        include = False

        if target == "all":
            include = True
        elif target == "youth" and age <= 34:
            include = True
        elif target == "no_house" and not has_house:
            include = True
        elif target == "parent":
            include = True
        elif target == "renter" and not has_house and annual_income <= 70000000:
            include = True
        elif target == "mortgage_holder" and has_house:
            include = True

        if include:
            if policy["name"] == "연금저축 세액공제" and has_pension_saving:
                continue
            if policy["name"] == "ISA (개인종합자산관리계좌)" and has_isa:
                continue

            applicable.append({
                "name": policy["name"],
                "condition": policy["condition"],
                "benefit": policy["benefit"],
                "annual_benefit": policy["max_benefit"],
            })
            total_benefit += policy["max_benefit"]

    return PolicyGuide(
        applicable_policies=applicable,
        total_potential_benefit=total_benefit,
    )


@router.get("/report", response_model=MonthlyReport)
def generate_monthly_report(db: Session = Depends(get_db)):
    """월간 재무 리포트 생성"""
    today = date.today()

    # 현재 자산/부채
    total_assets = db.query(func.coalesce(func.sum(Asset.amount), 0)).scalar()
    total_debts = db.query(func.coalesce(func.sum(Debt.remaining), 0)).scalar()
    net_worth = total_assets - total_debts

    # 수입/지출
    monthly_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.is_monthly.is_(True)).scalar()
    monthly_expense = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.is_monthly.is_(True)).scalar()
    savings = monthly_income - monthly_expense
    savings_rate = round(savings / monthly_income * 100, 1) if monthly_income > 0 else 0

    # 카테고리별 자산
    cat_rows = db.query(Asset.category, func.sum(Asset.amount)).group_by(Asset.category).all()
    by_category = {row[0]: row[1] for row in cat_rows}

    # 이전 스냅샷 대비 변화
    prev_snapshot = db.query(AssetHistory).order_by(AssetHistory.record_date.desc()).first()
    asset_change = {}
    if prev_snapshot:
        asset_change = {
            "prev_total": prev_snapshot.total_assets,
            "prev_net_worth": prev_snapshot.net_worth,
            "asset_diff": total_assets - prev_snapshot.total_assets,
            "net_worth_diff": net_worth - prev_snapshot.net_worth,
            "prev_date": str(prev_snapshot.record_date),
        }

    # 목표 진행 상황
    goals = db.query(Goal).order_by(Goal.priority).all()
    goal_progress = []
    for g in goals:
        progress = min(100, round(net_worth / g.target_amount * 100, 1)) if g.target_amount > 0 else 0
        goal_progress.append({
            "name": g.name,
            "target": g.target_amount,
            "progress": progress,
            "gap": max(0, g.target_amount - net_worth),
        })

    # 하이라이트 / 경고 / 추천
    highlights = []
    warnings = []
    recommendations = []

    if savings_rate >= 30:
        highlights.append(f"저축률 {savings_rate}%로 양호합니다.")
    elif savings_rate >= 20:
        highlights.append(f"저축률 {savings_rate}%입니다.")
    elif savings_rate > 0:
        warnings.append(f"저축률이 {savings_rate}%로 낮습니다. 지출 점검을 권장합니다.")
    else:
        warnings.append("수입 대비 지출이 많습니다. 긴급 지출 점검이 필요합니다.")

    if asset_change.get("net_worth_diff", 0) > 0:
        highlights.append(f"순자산이 지난 대비 {asset_change['net_worth_diff']:,.0f}원 증가했습니다.")
    elif asset_change.get("net_worth_diff", 0) < 0:
        warnings.append(f"순자산이 지난 대비 {abs(asset_change['net_worth_diff']):,.0f}원 감소했습니다.")

    # 부채 관련
    debt_ratio = total_debts / total_assets * 100 if total_assets > 0 else 0
    if debt_ratio > 50:
        warnings.append(f"부채비율이 {debt_ratio:.0f}%입니다. 부채 감축을 우선 고려하세요.")
    elif debt_ratio > 30:
        highlights.append(f"부채비율 {debt_ratio:.0f}%로 관리 가능한 수준입니다.")

    # 자산 집중도
    if by_category:
        max_cat = max(by_category, key=by_category.get)
        max_ratio = by_category[max_cat] / total_assets * 100 if total_assets > 0 else 0
        if max_ratio > 70:
            warnings.append(f"자산의 {max_ratio:.0f}%가 {max_cat}에 집중되어 있습니다. 분산 투자를 고려하세요.")

    # 추천
    if savings > 0:
        recommendations.append(f"월 저축 {savings:,.0f}원 중 연금저축/IRP에 우선 배분하면 세액공제 혜택을 받을 수 있습니다.")
    if not by_category.get("pension"):
        recommendations.append("연금 자산이 없습니다. 개인연금(연금저축/IRP) 가입을 검토하세요.")

    pensions = db.query(Pension).all()
    if not pensions:
        recommendations.append("연금 정보를 등록하면 노후 자금 분석을 받을 수 있습니다.")

    for g in goals:
        if g.target_date:
            days_left = (g.target_date - today).days
            if 0 < days_left < 365:
                recommendations.append(f"목표 '{g.name}' 달성일이 {days_left}일 남았습니다. 집중 저축을 고려하세요.")

    return MonthlyReport(
        report_date=str(today),
        summary={
            "total_assets": total_assets,
            "total_debts": total_debts,
            "net_worth": net_worth,
            "savings_rate": savings_rate,
            "debt_ratio": round(debt_ratio, 1),
        },
        highlights=highlights,
        warnings=warnings,
        recommendations=recommendations,
        asset_change=asset_change,
        income_expense={
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "monthly_savings": savings,
            "savings_rate": savings_rate,
        },
        goal_progress=goal_progress,
    )
