from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.gdrive_sync import (
    has_local_changes, encrypt_db, decrypt_db,
    backup_local_db, update_sync_meta,
)
from app.services.gdrive_api import (
    upload_to_drive, download_from_drive,
    upload_sync_meta, download_sync_meta,
    get_auth_status,
)
from app.config import DATA_DIR

router = APIRouter(prefix="/api/sync", tags=["sync"])

DB_FILE = DATA_DIR / "jasan.db"


class SyncStatus(BaseModel):
    has_local_changes: bool
    drive_authenticated: bool
    last_sync: str
    device: str


@router.get("/status", response_model=SyncStatus)
def sync_status():
    """동기화 상태 확인"""
    from app.services.gdrive_sync import _load_sync_meta
    meta = _load_sync_meta()
    auth = get_auth_status()
    return SyncStatus(
        has_local_changes=has_local_changes(),
        drive_authenticated=auth.get("authenticated", False),
        last_sync=meta.get("last_sync", "동기화 기록 없음"),
        device=meta.get("device", ""),
    )


@router.post("/upload")
def upload_db():
    """로컬 DB를 암호화하여 Google Drive에 업로드"""
    auth = get_auth_status()
    if not auth.get("authenticated"):
        raise HTTPException(status_code=400, detail=auth.get("reason", "인증 필요"))

    if not DB_FILE.exists():
        raise HTTPException(status_code=400, detail="로컬 DB가 없습니다.")

    # 암호화 후 업로드
    encrypted = encrypt_db()
    result = upload_to_drive(encrypted)

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "업로드 실패"))

    # 메타 업데이트
    meta = update_sync_meta()
    upload_sync_meta(meta)

    return {"message": "업로드 완료", "meta": meta}


@router.post("/download")
def download_db():
    """Google Drive에서 DB를 다운로드하여 로컬에 반영"""
    auth = get_auth_status()
    if not auth.get("authenticated"):
        raise HTTPException(status_code=400, detail=auth.get("reason", "인증 필요"))

    # 원격 메타 확인
    remote_meta = download_sync_meta()
    if not remote_meta:
        raise HTTPException(status_code=404, detail="원격 동기화 데이터가 없습니다.")

    # 로컬 백업
    backup_path = backup_local_db()

    # 다운로드 및 복호화
    encrypted = download_from_drive()
    if not encrypted:
        raise HTTPException(status_code=404, detail="원격 DB 파일을 찾을 수 없습니다.")

    try:
        decrypted = decrypt_db(encrypted)
    except Exception:
        raise HTTPException(status_code=400, detail="복호화 실패. 암호화 키가 다릅니다.")

    # 로컬 DB 교체
    DB_FILE.write_bytes(decrypted)
    update_sync_meta()

    return {
        "message": "다운로드 완료",
        "backup": backup_path,
        "remote_device": remote_meta.get("device", ""),
        "remote_sync_time": remote_meta.get("last_sync", ""),
    }


@router.get("/auth-status")
def check_auth():
    """Google Drive 인증 상태"""
    return get_auth_status()
