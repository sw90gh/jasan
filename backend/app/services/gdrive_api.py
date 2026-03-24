"""
Google Drive API 연동
- OAuth2 인증
- 파일 업로드/다운로드
- 변경분 동기화
"""
import io
import json
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload

from app.config import DATA_DIR

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKEN_FILE = DATA_DIR / "gdrive_token.json"
CREDENTIALS_FILE = DATA_DIR / "gdrive_credentials.json"
DRIVE_FOLDER_NAME = "JASAN_Sync"
DRIVE_DB_FILENAME = "jasan_encrypted.db"
DRIVE_META_FILENAME = "jasan_sync_meta.json"


def _get_credentials() -> Credentials | None:
    """Google OAuth2 인증 자격 증명 획득"""
    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json())
    elif not creds or not creds.valid:
        if not CREDENTIALS_FILE.exists():
            return None
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
        creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())

    return creds


def _get_drive_service():
    creds = _get_credentials()
    if not creds:
        return None
    return build("drive", "v3", credentials=creds)


def _find_or_create_folder(service) -> str:
    """JASAN_Sync 폴더 찾기 또는 생성"""
    results = service.files().list(
        q=f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces="drive",
        fields="files(id, name)",
    ).execute()
    files = results.get("files", [])

    if files:
        return files[0]["id"]

    folder_meta = {
        "name": DRIVE_FOLDER_NAME,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=folder_meta, fields="id").execute()
    return folder["id"]


def _find_file(service, folder_id: str, filename: str) -> str | None:
    """폴더 내 파일 ID 찾기"""
    results = service.files().list(
        q=f"name='{filename}' and '{folder_id}' in parents and trashed=false",
        spaces="drive",
        fields="files(id, name, modifiedTime)",
    ).execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def upload_to_drive(data: bytes, filename: str = DRIVE_DB_FILENAME) -> dict:
    """Google Drive에 파일 업로드 (변경분 = 전체 암호화 DB)"""
    service = _get_drive_service()
    if not service:
        return {"success": False, "error": "Google Drive 인증이 필요합니다. gdrive_credentials.json을 설정해주세요."}

    folder_id = _find_or_create_folder(service)
    file_id = _find_file(service, folder_id, filename)

    media = MediaIoBaseUpload(io.BytesIO(data), mimetype="application/octet-stream")

    if file_id:
        # 기존 파일 업데이트
        updated = service.files().update(
            fileId=file_id,
            media_body=media,
        ).execute()
        return {"success": True, "action": "updated", "file_id": updated["id"]}
    else:
        # 새 파일 생성
        file_meta = {"name": filename, "parents": [folder_id]}
        created = service.files().create(
            body=file_meta,
            media_body=media,
            fields="id",
        ).execute()
        return {"success": True, "action": "created", "file_id": created["id"]}


def download_from_drive(filename: str = DRIVE_DB_FILENAME) -> bytes | None:
    """Google Drive에서 파일 다운로드"""
    service = _get_drive_service()
    if not service:
        return None

    folder_id = _find_or_create_folder(service)
    file_id = _find_file(service, folder_id, filename)
    if not file_id:
        return None

    request = service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    return buffer.getvalue()


def upload_sync_meta(meta: dict) -> dict:
    """동기화 메타정보 업로드"""
    data = json.dumps(meta, ensure_ascii=False).encode()
    return upload_to_drive(data, DRIVE_META_FILENAME)


def download_sync_meta() -> dict | None:
    """원격 동기화 메타정보 다운로드"""
    data = download_from_drive(DRIVE_META_FILENAME)
    if data:
        return json.loads(data.decode())
    return None


def get_auth_status() -> dict:
    """Google Drive 인증 상태 확인"""
    if not CREDENTIALS_FILE.exists():
        return {"authenticated": False, "reason": "gdrive_credentials.json 파일이 없습니다."}
    creds = _get_credentials()
    if creds and creds.valid:
        return {"authenticated": True}
    return {"authenticated": False, "reason": "인증이 만료되었거나 아직 수행되지 않았습니다."}
