import base64
import hashlib
import secrets

import bcrypt

from app.core.config import BCRYPT_ROUNDS

LEGACY_PBKDF2_PREFIX = "pbkdf2_sha256$"


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except ValueError:
            return False

    if stored_hash.startswith(LEGACY_PBKDF2_PREFIX):
        return verify_legacy_pbkdf2_password(password, stored_hash)

    return False


def password_needs_rehash(stored_hash: str) -> bool:
    return not stored_hash.startswith(("$2a$", "$2b$", "$2y$"))


def verify_legacy_pbkdf2_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(encoded_salt)
        expected_digest = base64.b64decode(encoded_digest)
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return secrets.compare_digest(actual_digest, expected_digest)
    except (ValueError, TypeError):
        return False


def make_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
