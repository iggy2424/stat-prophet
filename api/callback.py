import os
import json
import time
import hmac
import hashlib
import base64
import requests as req
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

WHOP_CLIENT_ID     = os.environ.get("WHOP_CLIENT_ID")
WHOP_CLIENT_SECRET = os.environ.get("WHOP_CLIENT_SECRET")
WHOP_PRODUCT_IDS   = {
    "prod_sjZuDJVjBjx67",
    "prod_M1dvuYwoKXS3p",
    "prod_XQt15k4DIescc",
}
REDIRECT_URI = "https://app.trendbet.ai/api/callback"
JWT_SECRET   = os.environ.get("JWT_SECRET", "").encode()
COOKIE_NAME  = "whop_session"
MAX_AGE      = 60 * 60 * 24 * 7  # 7 days


# ── Minimal JWT (HS256) ──────────────────────────────────────────────────────

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _sign_jwt(payload: dict) -> str:
    header  = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload["exp"] = int(time.time()) + MAX_AGE
    body    = _b64url(json.dumps(payload).encode())
    sig     = _b64url(
        hmac.new(JWT_SECRET, f"{header}.{body}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{body}.{sig}"

def _verify_jwt(token: str) -> dict | None:
    try:
        header, body, sig = token.split(".")
        expected = _b64url(
            hmac.new(JWT_SECRET, f"{header}.{body}".encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig, expected):
            return None
        padding = 4 - len(body) % 4
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * padding))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _exchange_code(code: str) -> tuple:
    try:
        r = req.post("https://api.whop.com/api/v2/oauth/token",
            headers={"Authorization": f"Bearer {WHOP_CLIENT_SECRET}"},
            data={
                "code":         code,
                "client_id":    WHOP_CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "grant_type":   "authorization_code",
            },
            timeout=10)
        print("Token exchange status:", r.status_code, r.text[:500])
        if not r.ok:
            return None, f"{r.status_code}:{r.text[:120]}"
        return r.json(), None
    except Exception as e:
        print("Token exchange failed:", e)
        return None, str(e)[:120]

def _has_active_membership(access_token: str) -> bool:
    try:
        r = req.get("https://api.whop.com/v5/me/memberships",
                    headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
        r.raise_for_status()
        memberships = r.json().get("data", [])
        return any(
            m.get("valid") is True and m.get("product_id") in WHOP_PRODUCT_IDS
            for m in memberships
        )
    except Exception as e:
        print("Membership check failed:", e)
        return False


# ── Handler ──────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs   = parse_qs(urlparse(self.path).query)
        code = qs.get("code", [None])[0]

        if not code:
            self._redirect("/login?error=no_code")
            return

        tokens, err = _exchange_code(code)
        if not tokens:
            from urllib.parse import quote
            self._redirect(f"/login?error=token_exchange&detail={quote(err or 'unknown')}")
            return

        access_token  = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in    = tokens.get("expires_in", 3600)

        if not _has_active_membership(access_token):
            self._redirect("/login?error=no_membership")
            return

        session = {
            "token":        access_token,
            "refreshToken": refresh_token,
            "expires_at":   int((time.time() + expires_in) * 1000),
            "lastChecked":  int(time.time() * 1000),
        }
        jwt_token = _sign_jwt(session)

        cookie = (
            f"{COOKIE_NAME}={jwt_token}; "
            f"HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age={MAX_AGE}"
        )

        self.send_response(302)
        self.send_header("Set-Cookie", cookie)
        self.send_header("Location", "/")
        self.end_headers()

    def _redirect(self, url: str):
        self.send_response(302)
        self.send_header("Location", url)
        self.end_headers()
