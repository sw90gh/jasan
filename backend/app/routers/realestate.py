import os
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/realestate", tags=["realestate"])

# 공공데이터포털 API 키 (환경변수)
DATA_API_KEY = os.getenv("DATA_GO_KR_API_KEY", "")

# 법정동 코드 주요 지역 (시군구)
REGION_CODES = {
    "서울 강남구": "11680", "서울 서초구": "11650", "서울 송파구": "11710",
    "서울 마포구": "11440", "서울 용산구": "11170", "서울 성동구": "11200",
    "서울 강동구": "11740", "서울 영등포구": "11560", "서울 노원구": "11350",
    "서울 강서구": "11500",
    "경기 성남시": "41130", "경기 수원시": "41110", "경기 용인시": "41460",
    "경기 화성시": "41590", "경기 고양시": "41280", "경기 부천시": "41190",
    "경기 안양시": "41170", "경기 평택시": "41220",
    "부산 해운대구": "26350", "부산 수영구": "26410",
    "대전 유성구": "30200", "대구 수성구": "22170",
    "인천 연수구": "28185", "인천 서구": "28260",
}


class ApartmentTrade(BaseModel):
    apartment_name: str
    area: float  # 전용면적 (m2)
    floor: str
    price: float  # 만원
    deal_date: str
    dong: str
    year_built: str | None = None


class RegionSummary(BaseModel):
    region: str
    avg_price: float
    max_price: float
    min_price: float
    trade_count: int
    trades: list[ApartmentTrade]


@router.get("/regions")
def list_regions():
    """조회 가능한 지역 목록"""
    return [{"name": k, "code": v} for k, v in REGION_CODES.items()]


@router.get("/trades", response_model=RegionSummary)
async def get_apartment_trades(
    region_code: str = "11680",
    year_month: str | None = None,
):
    """국토교통부 아파트 실거래가 조회"""
    if not DATA_API_KEY:
        raise HTTPException(status_code=400, detail="DATA_GO_KR_API_KEY 환경변수를 설정해주세요. 공공데이터포털(data.go.kr)에서 '국토교통부 아파트매매 실거래자료' API 키를 발급받으세요.")

    if not year_month:
        now = datetime.now()
        # 최근 월 데이터 (2개월 전, 실거래가는 보통 2달 후 공개)
        month = now.month - 2
        year = now.year
        if month <= 0:
            month += 12
            year -= 1
        year_month = f"{year}{month:02d}"

    url = "http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev"
    params = {
        "serviceKey": DATA_API_KEY,
        "LAWD_CD": region_code,
        "DEAL_YMD": year_month,
        "pageNo": 1,
        "numOfRows": 100,
        "type": "json",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"API 호출 실패: {str(e)}")

    items = []
    try:
        body = data.get("response", {}).get("body", {})
        raw_items = body.get("items", {}).get("item", [])
        if isinstance(raw_items, dict):
            raw_items = [raw_items]
    except (AttributeError, TypeError):
        raw_items = []

    trades = []
    prices = []
    for item in raw_items:
        try:
            price_str = str(item.get("거래금액", "0")).strip().replace(",", "")
            price = int(price_str)
            trade = ApartmentTrade(
                apartment_name=str(item.get("아파트", "")),
                area=float(item.get("전용면적", 0)),
                floor=str(item.get("층", "")),
                price=price,
                deal_date=f"{item.get('년', '')}-{str(item.get('월', '')).zfill(2)}-{str(item.get('일', '')).zfill(2)}",
                dong=str(item.get("법정동", "")),
                year_built=str(item.get("건축년도", "")) if item.get("건축년도") else None,
            )
            trades.append(trade)
            prices.append(price)
        except (ValueError, TypeError):
            continue

    region_name = next((k for k, v in REGION_CODES.items() if v == region_code), region_code)

    return RegionSummary(
        region=region_name,
        avg_price=round(sum(prices) / len(prices)) if prices else 0,
        max_price=max(prices) if prices else 0,
        min_price=min(prices) if prices else 0,
        trade_count=len(trades),
        trades=sorted(trades, key=lambda t: t.price, reverse=True)[:50],
    )


@router.get("/my-apartment")
async def search_my_apartment(
    apartment_name: str,
    region_code: str = "11680",
):
    """내 아파트 최근 실거래가 검색"""
    if not DATA_API_KEY:
        raise HTTPException(status_code=400, detail="DATA_GO_KR_API_KEY 환경변수를 설정해주세요.")

    # 최근 6개월 데이터 조회
    now = datetime.now()
    all_trades = []

    for i in range(2, 8):  # 2~7개월 전
        month = now.month - i
        year = now.year
        if month <= 0:
            month += 12
            year -= 1
        ym = f"{year}{month:02d}"

        url = "http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTradeDev"
        params = {
            "serviceKey": DATA_API_KEY,
            "LAWD_CD": region_code,
            "DEAL_YMD": ym,
            "pageNo": 1,
            "numOfRows": 500,
            "type": "json",
        }

        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(url, params=params)
                data = resp.json()
                body = data.get("response", {}).get("body", {})
                raw_items = body.get("items", {}).get("item", [])
                if isinstance(raw_items, dict):
                    raw_items = [raw_items]

                for item in raw_items:
                    apt_name = str(item.get("아파트", ""))
                    if apartment_name.lower() in apt_name.lower():
                        price_str = str(item.get("거래금액", "0")).strip().replace(",", "")
                        all_trades.append(ApartmentTrade(
                            apartment_name=apt_name,
                            area=float(item.get("전용면적", 0)),
                            floor=str(item.get("층", "")),
                            price=int(price_str),
                            deal_date=f"{item.get('년', '')}-{str(item.get('월', '')).zfill(2)}-{str(item.get('일', '')).zfill(2)}",
                            dong=str(item.get("법정동", "")),
                            year_built=str(item.get("건축년도", "")) if item.get("건축년도") else None,
                        ))
            except Exception:
                continue

    if not all_trades:
        return {"message": f"'{apartment_name}'에 대한 최근 거래 내역이 없습니다.", "trades": []}

    return {
        "apartment_name": apartment_name,
        "trade_count": len(all_trades),
        "trades": sorted(all_trades, key=lambda t: t.deal_date, reverse=True),
    }
