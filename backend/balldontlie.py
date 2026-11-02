"""BallDontLie NBA client (api.balldontlie.io/v1). Source of player box scores.

Like ApiSports, every call is counted so sync_log records the requests a job spent.
"""
import threading
import time

import requests

from . import config

BASE = "https://api.balldontlie.io/v1"

# ALL-STAR plan: 60 requests/minute. The free and trial tiers allow 5/minute; calls then
# hit 429 and wait, so jobs still finish, just slowly.
MIN_INTERVAL = 1.05
RATE_LIMIT_WAIT = 15  # seconds to back off after a 429
MAX_RATE_LIMIT_WAITS = 40


class BallDontLieError(RuntimeError):
    pass


class BallDontLie:
    def __init__(self):
        self.key = config.get("BALLDONTLIE_API_KEY")
        self.requests_used = 0
        self._lock = threading.Lock()
        self._next_slot = 0.0

    def _wait_turn(self) -> None:
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + MIN_INTERVAL
            self.requests_used += 1
        time.sleep(max(0.0, slot - now))

    def get(self, path: str, params: dict | None = None, retries: int = 4) -> dict:
        """GET one page and return the whole body ('data' and 'meta')."""
        last_error, failures, waits = None, 0, 0
        while failures < retries:
            self._wait_turn()
            try:
                resp = requests.get(f"{BASE}/{path.lstrip('/')}", headers={"Authorization": self.key},
                                    params=params or {}, timeout=30)
            except requests.RequestException as e:
                last_error = f"network error: {e}"
            else:
                if resp.status_code == 200:
                    return resp.json()
                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                if resp.status_code == 429 and waits < MAX_RATE_LIMIT_WAITS:
                    waits += 1
                    time.sleep(RATE_LIMIT_WAIT)
                    continue  # rate limits do not count as failures
                if resp.status_code < 500:
                    break  # client errors will not fix themselves
            failures += 1
            time.sleep(1.5 * failures)
        raise BallDontLieError(f"{path} failed: {last_error}")

    def get_all(self, path: str, params: dict | None = None) -> list:
        """Follow meta.next_cursor and return every row."""
        params = {**(params or {}), "per_page": 100}
        rows = []
        while True:
            body = self.get(path, params)
            rows += body.get("data", [])
            cursor = (body.get("meta") or {}).get("next_cursor")
            if not cursor:
                return rows
            params["cursor"] = cursor
