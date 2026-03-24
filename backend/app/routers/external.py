"""외부 금융 연동 API (키움증권, 오픈뱅킹)"""
from fastapi import APIRouter, HTTPException

from app.services.kiwoom_api import get_stock_balance, get_account_summary, get_stock_price
from app.services.openbanking_api import get_accounts, get_balance, get_transactions

router = APIRouter(prefix="/api/external", tags=["external"])


# === 키움증권 ===
@router.get("/kiwoom/balance")
async def kiwoom_stock_balance():
    """키움증권 주식 잔고 조회"""
    try:
        stocks = await get_stock_balance()
        summary = await get_account_summary()
        return {"stocks": stocks, "summary": summary}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"키움 API 오류: {str(e)}")


@router.get("/kiwoom/price/{stock_code}")
async def kiwoom_stock_price(stock_code: str):
    """개별 종목 현재가 조회"""
    try:
        return await get_stock_price(stock_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"키움 API 오류: {str(e)}")


@router.get("/kiwoom/status")
async def kiwoom_status():
    """키움증권 연동 상태"""
    import os
    has_key = bool(os.getenv("KIUM_APP_KEY"))
    has_secret = bool(os.getenv("KIUM_APP_SECRET"))
    has_account = bool(os.getenv("KIWOOM_ACCOUNT"))
    return {
        "configured": has_key and has_secret,
        "has_account": has_account,
        "message": "연동 준비 완료" if (has_key and has_secret) else "KIUM_APP_KEY, KIUM_APP_SECRET 환경변수를 설정해주세요.",
    }


# === 오픈뱅킹 (신한은행 등) ===
@router.get("/bank/accounts")
async def bank_accounts():
    """등록 계좌 목록"""
    try:
        return await get_accounts()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"오픈뱅킹 API 오류: {str(e)}")


@router.get("/bank/balance/{fintech_use_num}")
async def bank_balance(fintech_use_num: str):
    """계좌 잔액 조회"""
    try:
        return await get_balance(fintech_use_num)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"오픈뱅킹 API 오류: {str(e)}")


@router.get("/bank/transactions/{fintech_use_num}")
async def bank_transactions(fintech_use_num: str, from_date: str | None = None, to_date: str | None = None):
    """거래내역 조회"""
    try:
        return await get_transactions(fintech_use_num, from_date, to_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"오픈뱅킹 API 오류: {str(e)}")


@router.get("/bank/status")
async def bank_status():
    """오픈뱅킹 연동 상태"""
    import os
    has_token = bool(os.getenv("OPENBANKING_ACCESS_TOKEN"))
    return {
        "configured": has_token,
        "message": "연동 준비 완료" if has_token else "OPENBANKING_ACCESS_TOKEN 환경변수를 설정해주세요.",
    }
