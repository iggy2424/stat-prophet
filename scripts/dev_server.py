"""Local API server: serves the same handler Vercel runs, on http://localhost:8000/api.

Reads secrets from .env and sets TB_DEV=1, which skips the member login check.
Usually started by `npm run dev` together with the frontend.
"""
import os
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

os.environ["TB_DEV"] = "1"
from backend import config  # noqa: E402

config.load_local_env()

sys.path.insert(0, str(ROOT / "api"))
from index import handler  # noqa: E402

PORT = int(os.environ.get("API_PORT", "8000"))

if __name__ == "__main__":
    print(f"API running on http://localhost:{PORT}/api  (dev mode, login check off)")
    ThreadingHTTPServer(("127.0.0.1", PORT), handler).serve_forever()
