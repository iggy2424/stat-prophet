"""API-Sports NBA client (v2.nba.api-sports.io).

Only sync jobs use this. Every call is counted so each job can record how many
requests it spent in sync_log.
"""
import threading
import time

import requests

from . import config

BASE = "https://v2.nba.api-sports.io"

# Pro plan: 300 requests/minute, and bursts are rejected too. Spacing calls 0.25s apart
# keeps us at 240/minute however many threads a job uses.
MIN_INTERVAL = 0.25
RATE_LIMIT_WAIT = 15  # seconds to back off after a rate limit reply


class ApiSportsError(RuntimeError):
    pass


class ApiSports:
    def __init__(self):
        self.key = config.get("API_SPORTS_KEY")
        self.requests_used = 0
        self._lock = threading.Lock()  # jobs may call get() from several threads
        self._next_slot = 0.0

    def _wait_turn(self) -> None:
        """Reserve the next request slot so calls stay MIN_INTERVAL apart across threads."""
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + MIN_INTERVAL
            self.requests_used += 1
        time.sleep(max(0.0, slot - now))

    def get(self, path: str, params: dict | None = None, retries: int = 4) -> list:
        """GET an endpoint and return its 'response' list. Retries transient failures."""
        last_error = None
        for attempt in range(retries):
            self._wait_turn()
            try:
                resp = requests.get(
                    f"{BASE}/{path.lstrip('/')}",
                    headers={"x-apisports-key": self.key},
                    params=params or {},
                    timeout=20,
                )
            except requests.RequestException as e:
                last_error = f"network error: {e}"
            else:
                if resp.status_code == 200:
                    body = resp.json()
                    errors = body.get("errors")
                    # API-Sports reports problems in 'errors' with a 200 status
                    if isinstance(errors, dict) and "rateLimit" in errors:
                        last_error = f"rate limited: {errors['rateLimit']}"
                        time.sleep(RATE_LIMIT_WAIT)
                        continue
                    if errors:
                        raise ApiSportsError(f"{path}: {errors}")
                    return body.get("response", [])
                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                if resp.status_code < 500 and resp.status_code != 429:
                    break  # client errors will not fix themselves
            time.sleep(1.5 * (attempt + 1))
        raise ApiSportsError(f"{path} failed: {last_error}")
