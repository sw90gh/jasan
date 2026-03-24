"""
오픈뱅킹 API 연동 (신한은행 포함)
- 계좌 목록 조회
- 계좌 잔액 조회
- 거래내역 조회

오픈뱅킹 API: https://developers.openbanking.or.kr
실제 사용 시 금융결제원에서 이용기관 등록 필요 (개인은 테스트만 가능)
"""
import os
import httpx
from datetime import datetime, timedelta

OPENBANKING_BASE_URL = os.getenv("OPENBANKING_BASE_URL", "https://testapi.openbanking.or.kr")
OPENBANKING_CLIENT_ID = os.getenv("OPENBANKING_CLIENT_ID", "")
OPENBANKING_CLIENT_SECRET = os.getenv("OPENBANKING_CLIENT_SECRET", "")
OPENBANKING_ACCESS_TOKEN = os.getenv("OPENBANKING_ACCESS_TOKEN", "")
OPENBANKING_USER_SEQ_NO = os.getenv("OPENBANKING_USER_SEQ_NO", "")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {OPENBANKING_ACCESS_TOKEN}",
        "Content-Type": "application/json; charset=UTF-8",
    }


async def get_accounts() -> list[dict]:
    """등록 계좌 목록 조회"""
    if not OPENBANKING_ACCESS_TOKEN:
        raise ValueError("오픈뱅킹 Access Token이 설정되지 않았습니다.")

    params = {
        "user_seq_no": OPENBANKING_USER_SEQ_NO,
        "include_cancel_yn": "N",
        "sort_order": "D",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OPENBANKING_BASE_URL}/v2.0/account/list",
            headers=_headers(),
            params=params,
        )
        data = resp.json()

    accounts = []
    for acc in data.get("res_list", []):
        accounts.append({
            "fintech_use_num": acc.get("fintech_use_num", ""),
            "bank_name": acc.get("bank_name", ""),
            "account_alias": acc.get("account_alias", ""),
            "account_num_masked": acc.get("account_num_masked", ""),
            "account_type": acc.get("account_type", ""),
        })
    return accounts


async def get_balance(fintech_use_num: str) -> dict:
    """계좌 잔액 조회"""
    if not OPENBANKING_ACCESS_TOKEN:
        raise ValueError("오픈뱅킹 Access Token이 설정되지 않았습니다.")

    params = {
        "bank_tran_id": f"{OPENBANKING_CLIENT_ID}U{datetime.now().strftime('%H%M%S%f')[:9]}",
        "fintech_use_num": fintech_use_num,
        "tran_dtime": datetime.now().strftime("%Y%m%d%H%M%S"),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OPENBANKING_BASE_URL}/v2.0/account/balance/fin_num",
            headers=_headers(),
            params=params,
        )
        data = resp.json()

    return {
        "bank_name": data.get("bank_name", ""),
        "account_num_masked": data.get("account_num_masked", ""),
        "balance": int(data.get("balance_amt", 0)),
        "available": int(data.get("available_amt", 0)),
        "product_name": data.get("product_name", ""),
    }


async def get_transactions(
    fintech_use_num: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict]:
    """거래내역 조회"""
    if not OPENBANKING_ACCESS_TOKEN:
        raise ValueError("오픈뱅킹 Access Token이 설정되지 않았습니다.")

    if not from_date:
        from_date = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")
    if not to_date:
        to_date = datetime.now().strftime("%Y%m%d")

    params = {
        "bank_tran_id": f"{OPENBANKING_CLIENT_ID}U{datetime.now().strftime('%H%M%S%f')[:9]}",
        "fintech_use_num": fintech_use_num,
        "inquiry_type": "A",
        "inquiry_base": "D",
        "from_date": from_date,
        "to_date": to_date,
        "sort_order": "D",
        "tran_dtime": datetime.now().strftime("%Y%m%d%H%M%S"),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OPENBANKING_BASE_URL}/v2.0/account/transaction_list/fin_num",
            headers=_headers(),
            params=params,
        )
        data = resp.json()

    transactions = []
    for tx in data.get("res_list", []):
        transactions.append({
            "date": tx.get("tran_date", ""),
            "time": tx.get("tran_time", ""),
            "type": tx.get("inout_type", ""),  # 입금/출금
            "amount": int(tx.get("tran_amt", 0)),
            "balance_after": int(tx.get("after_balance_amt", 0)),
            "description": tx.get("print_content", ""),
        })
    return transactions
