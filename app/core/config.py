import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

OPENAI_API_KEY = (
    os.getenv("OPENAI_API_KEY", "").strip()
    or os.getenv("OPENAI_API_KEYS", "").strip()
)
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None
IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", "").strip()
IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY", "").strip()
IMAGEKIT_URL_ENDPOINTS = os.getenv("IMAGEKIT_URL_ENDPOINTS", "").strip()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./thumbnail_builder.db").strip()
AUTH_SESSION_DAYS = int(os.getenv("AUTH_SESSION_DAYS", "7"))
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))
SQL_ECHO = os.getenv("SQL_ECHO", "false").strip().lower() in {"1", "true", "yes"}
