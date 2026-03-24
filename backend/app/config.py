import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'jasan.db'}"

# Google Drive sync
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# API Keys
KIUM_APP_KEY = os.getenv("KIUM_APP_KEY", "")
KIUM_APP_SECRET = os.getenv("KIUM_APP_SECRET", "")

# Encryption key for DB sync
SYNC_ENCRYPTION_KEY = os.getenv("SYNC_ENCRYPTION_KEY", "")
