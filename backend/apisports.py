"""API-Sports NBA client (v2.nba.api-sports.io).

Only sync jobs use this. Every call is counted so each job can record how many
requests it spent in sync_log.
"""
import time

import requests

from . import config

BASE = "https://v2.nba.api-sports.io"


class ApiSportsError(RuntimeError):
    pass


class ApiSports:
    def __init__(self):
        self.key = config.get("API_SPORTS_KEY")
        self.requests_used = 0

    def get(self, path: str, params: dict | None = None, retries: int = 3) -> list:
        """GET an endpoint and return its 'response' list. Retries transient failures."""
        last_error = None
        for attempt in range(retries):
            self.requests_used += 1
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
                    # API-Sports reports problems in 'errors' with a 200 status
                    if body.get("errors"):
                        raise ApiSportsError(f"{path}: {body['errors']}")
                    return body.get("response", [])
                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                if resp.status_code < 500 and resp.status_code != 429:
                    break  # client errors will not fix themselves
            time.sleep(1.5 * (attempt + 1))
        raise ApiSportsError(f"{path} failed: {last_error}")
