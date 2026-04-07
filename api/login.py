import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlencode

WHOP_CLIENT_ID = os.environ.get("WHOP_CLIENT_ID")
REDIRECT_URI = "https://app.trendbet.ai/api/callback"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        params = urlencode({
            "client_id": WHOP_CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
        })
        whop_auth_url = f"https://whop.com/oauth?{params}"

        self.send_response(302)
        self.send_header("Location", whop_auth_url)
        self.end_headers()
