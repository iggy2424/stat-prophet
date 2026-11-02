"""Vercel entry point for /api?type=...

Routing and auth only. All logic lives in the backend package.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import auth, handlers  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = parse_qs(urlparse(self.path).query)
        route = (params.get("type") or [None])[0]

        if route in handlers.CRON_ROUTES:
            if not auth.is_cron(self.headers):
                return self._send(401, {"error": "unauthorized"})
            fn = handlers.CRON_ROUTES[route]
        elif route in handlers.MEMBER_ROUTES:
            if not auth.is_member(self.headers):
                return self._send(401, {"error": "unauthorized"})
            fn = handlers.MEMBER_ROUTES[route]
        else:
            return self._send(404, {"error": f"unknown type {route!r}"})

        try:
            status, body = fn(params)
        except Exception as e:
            # Surface the failure. Never turn an error into empty data.
            status, body = 500, {"error": f"{type(e).__name__}: {e}"}
        self._send(status, body)

    def _send(self, status: int, body: dict):
        data = json.dumps(body, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass
