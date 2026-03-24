"""
Google Drive 동기화 서비스
- SQLite DB의 변경분을 감지하여 암호화 후 Google Drive에 업로드
- 다른 기기에서 다운로드하여 복호화 후 로컬 DB에 반영
"""
import os
import json
import hashlib
import shutil
from pathlib import Path
from datetime import datetime

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

from app.config import DATA_DIR, SYNC_ENCRYPTION_KEY


SYNC_META_FILE = DATA_DIR / "sync_meta.json"
SYNC_BACKUP_DIR = DATA_DIR / "sync_backup"
DB_FILE = DATA_DIR / "jasan.db"


def _get_fernet() -> Fernet:
    """암호화 키 생성 (SYNC_ENCRYPTION_KEY 기반)"""
    key = SYNC_ENCRYPTION_KEY or "default-key-change-me"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"jasan-sync-salt",
        iterations=480000,
    )
    derived = base64.urlsafe_b64encode(kdf.derive(key.encode()))
    return Fernet(derived)


def _file_hash(filepath: Path) -> str:
    """파일 SHA256 해시"""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_sync_meta() -> dict:
    if SYNC_META_FILE.exists():
        return json.loads(SYNC_META_FILE.read_text())
    return {"last_hash": "", "last_sync": "", "device": ""}


def _save_sync_meta(meta: dict):
    SYNC_META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False))


def has_local_changes() -> bool:
    """로컬 DB가 마지막 동기화 이후 변경되었는지 확인"""
    if not DB_FILE.exists():
        return False
    meta = _load_sync_meta()
    current_hash = _file_hash(DB_FILE)
    return current_hash != meta.get("last_hash", "")


def encrypt_db() -> bytes:
    """DB 파일을 암호화"""
    f = _get_fernet()
    with open(DB_FILE, "rb") as fp:
        return f.encrypt(fp.read())


def decrypt_db(encrypted_data: bytes) -> bytes:
    """암호화된 DB 데이터를 복호화"""
    f = _get_fernet()
    return f.decrypt(encrypted_data)


def backup_local_db():
    """로컬 DB 백업"""
    SYNC_BACKUP_DIR.mkdir(exist_ok=True)
    if DB_FILE.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = SYNC_BACKUP_DIR / f"jasan_{timestamp}.db"
        shutil.copy2(DB_FILE, backup_path)
        # 최근 5개만 유지
        backups = sorted(SYNC_BACKUP_DIR.glob("jasan_*.db"), reverse=True)
        for old in backups[5:]:
            old.unlink()
        return str(backup_path)
    return None


def update_sync_meta(device_name: str = ""):
    """동기화 메타 업데이트"""
    import platform
    meta = {
        "last_hash": _file_hash(DB_FILE) if DB_FILE.exists() else "",
        "last_sync": datetime.now().isoformat(),
        "device": device_name or platform.node(),
    }
    _save_sync_meta(meta)
    return meta
