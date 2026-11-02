"""Request authentication.

Members: the whop_session cookie, an HS256 JWT signed by api/callback.js with JWT_SECRET.
Cron and sync calls: Authorization: Bearer <CRON_SECRET>.
Local development (TB_DEV=1) and opted-in Vercel previews skip the member check.
"""
import base64
import hashlib
import hmac
import json
import time

from . import config

COOKIE_NAME = "whop_session"


def _cookie(headers, name: str) -> str | None:
    raw = headers.get("Cookie") or headers.get("cookie") or ""
    for part in raw.split(";"):
        k, _, v = part.strip().partition("=")
        if k == name:
            return v.strip()
    return None


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def is_member(headers) -> bool:
    if config.is_dev() or config.preview_skips_login():
        return True
    token = _cookie(headers, COOKIE_NAME)
    secret = config.get("JWT_SECRET", required=False).encode()
    if not token or not secret:
        return False
    try:
        header, body, sig = token.split(".")
        expected = _b64(hmac.new(secret, f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return False
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        return payload.get("exp", 0) > time.time()
    except Exception:
        return False


def is_cron(headers) -> bool:
    secret = config.get("CRON_SECRET", required=False)
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    if config.is_dev() and not secret:
        return True
    return bool(secret) and hmac.compare_digest(auth, f"Bearer {secret}")
