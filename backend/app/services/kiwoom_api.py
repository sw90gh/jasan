"""
키움증권 Open API 연동
- 주식 잔고 조회
- 실시간 시세 조회
- 계좌 잔액 조회

키움 Open API: https://openapi.koreainvestment.com (한국투자증권 기반)
키움증권도 REST API를 제공하며, 유사한 구조입니다.
실제 사용 시 키움증권 HTS에서 Open API 신청 필요.
"""
import os
import httpx
from datetime import datetime

# 키움 REST API (모의투자/실전 공통)
KIWOOM_BASE_URL = os.getenv("KIWOOM_BASE_URL", "https://openapi.koreainvestment.com:9443")
KIWOOM_APP_KEY = os.getenv("KIUM_APP_KEY", "")
KIWOOM_APP_SECRET = os.getenv("KIUM_APP_SECRET", "")
KIWOOM_ACCOUNT = os.getenv("KIWOOM_ACCOUNT", "")  # 계좌번호

_access_token = ""
_token_expires = ""


async def _get_token() -> str:
    """OAuth 토큰 발급"""
    global _access_token, _token_expires

    if _access_token and _token_expires > datetime.now().isoformat():
        return _access_token

    if not KIWOOM_APP_KEY or not KIWOOM_APP_SECRET:
        raise ValueError("키움증권 API 키가 설정되지 않았습니다. KIUM_APP_KEY, KIUM_APP_SECRET 환경변수를 설정해주세요.")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{KIWOOM_BASE_URL}/oauth2/tokenP",
            json={
                "grant_type": "client_credentials",
                "appkey": KIWOOM_APP_KEY,
                "appsecret": KIWOOM_APP_SECRET,
            },
        )
        data = resp.json()
        _access_token = data.get("access_token", "")
        _token_expires = data.get("access_token_token_expired", "")
        return _access_token


def _auth_headers(token: str) -> dict:
    return {
        "authorization": f"Bearer {token}",
        "appkey": KIWOOM_APP_KEY,
        "appsecret": KIWOOM_APP_SECRET,
        "Content-Type": "application/json; charset=utf-8",
    }


async def get_stock_balance() -> list[dict]:
    """주식 잔고 조회"""
    token = await _get_token()
    headers = _auth_headers(token)
    headers["tr_id"] = "TTTC8434R"  # 주식잔고조회

    params = {
        "CANO": KIWOOM_ACCOUNT[:8] if KIWOOM_ACCOUNT else "",
        "ACNT_PRDT_CD": KIWOOM_ACCOUNT[8:] if len(KIWOOM_ACCOUNT) > 8 else "01",
        "AFHR_FLPR_YN": "N",
        "OFL_YN": "",
        "INQR_DVSN": "02",
        "UNPR_DVSN": "01",
        "FUND_STTL_ICLD_YN": "N",
        "FNCG_AMT_AUTO_RDPT_YN": "N",
        "PRCS_DVSN": "00",
        "CTX_AREA_FK100": "",
        "CTX_AREA_NK100": "",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{KIWOOM_BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance",
            headers=headers,
            params=params,
        )
        data = resp.json()

    stocks = []
    for item in data.get("output1", []):
        stocks.append({
            "stock_code": item.get("pdno", ""),
            "stock_name": item.get("prdt_name", ""),
            "quantity": int(item.get("hldg_qty", 0)),
            "avg_price": float(item.get("pchs_avg_pric", 0)),
            "current_price": float(item.get("prpr", 0)),
            "eval_amount": float(item.get("evlu_amt", 0)),
            "profit_loss": float(item.get("evlu_pfls_amt", 0)),
            "profit_rate": float(item.get("evlu_pfls_rt", 0)),
        })

    return stocks


async def get_account_summary() -> dict:
    """계좌 총 평가 조회"""
    token = await _get_token()
    headers = _auth_headers(token)
    headers["tr_id"] = "TTTC8434R"

    params = {
        "CANO": KIWOOM_ACCOUNT[:8] if KIWOOM_ACCOUNT else "",
        "ACNT_PRDT_CD": KIWOOM_ACCOUNT[8:] if len(KIWOOM_ACCOUNT) > 8 else "01",
        "AFHR_FLPR_YN": "N",
        "OFL_YN": "",
        "INQR_DVSN": "02",
        "UNPR_DVSN": "01",
        "FUND_STTL_ICLD_YN": "N",
        "FNCG_AMT_AUTO_RDPT_YN": "N",
        "PRCS_DVSN": "00",
        "CTX_AREA_FK100": "",
        "CTX_AREA_NK100": "",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{KIWOOM_BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance",
            headers=headers,
            params=params,
        )
        data = resp.json()

    output2 = data.get("output2", [{}])
    summary = output2[0] if output2 else {}

    return {
        "total_eval": float(summary.get("tot_evlu_amt", 0)),
        "total_purchase": float(summary.get("pchs_amt_smtl_amt", 0)),
        "total_profit_loss": float(summary.get("evlu_pfls_smtl_amt", 0)),
        "deposit": float(summary.get("dnca_tot_amt", 0)),
        "total_asset": float(summary.get("sma_evlu_amt", 0)),
    }


async def get_stock_price(stock_code: str) -> dict:
    """개별 종목 현재가 조회"""
    token = await _get_token()
    headers = _auth_headers(token)
    headers["tr_id"] = "FHKST01010100"

    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": stock_code,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{KIWOOM_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price",
            headers=headers,
            params=params,
        )
        data = resp.json()

    output = data.get("output", {})
    return {
        "stock_code": stock_code,
        "stock_name": output.get("rprs_mrkt_kor_name", ""),
        "current_price": int(output.get("stck_prpr", 0)),
        "change": int(output.get("prdy_vrss", 0)),
        "change_rate": float(output.get("prdy_ctrt", 0)),
        "volume": int(output.get("acml_vol", 0)),
        "high": int(output.get("stck_hgpr", 0)),
        "low": int(output.get("stck_lwpr", 0)),
    }
