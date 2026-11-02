"""Minimal Supabase (PostgREST) client.

Uses the service role key, so it bypasses row level security. Errors are raised,
never swallowed: a failed read must surface as an error, not as empty data.
"""
import requests

from . import config


class DbError(RuntimeError):
    pass


def _base() -> str:
    return config.get("SUPABASE_URL").rstrip("/") + "/rest/v1"


def _headers(extra: dict | None = None) -> dict:
    key = config.get("SUPABASE_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if extra:
        headers.update(extra)
    return headers


def _check(resp: requests.Response) -> requests.Response:
    if resp.status_code >= 400:
        raise DbError(f"Supabase {resp.status_code}: {resp.text[:300]}")
    return resp


def select(table: str, params: dict | None = None) -> list[dict]:
    """GET rows. params are PostgREST query params, e.g. {"select": "*", "id": "eq.5"}."""
    resp = requests.get(f"{_base()}/{table}", headers=_headers(), params=params or {}, timeout=20)
    return _check(resp).json()


def upsert(table: str, rows: list[dict], on_conflict: str = "id", chunk: int = 500) -> int:
    """Insert or update rows by primary key. Returns the number of rows sent."""
    headers = _headers({"Prefer": "resolution=merge-duplicates,return=minimal"})
    for i in range(0, len(rows), chunk):
        resp = requests.post(
            f"{_base()}/{table}",
            headers=headers,
            params={"on_conflict": on_conflict},
            json=rows[i:i + chunk],
            timeout=60,
        )
        _check(resp)
    return len(rows)


def insert(table: str, row: dict) -> dict:
    headers = _headers({"Prefer": "return=representation"})
    resp = requests.post(f"{_base()}/{table}", headers=headers, json=row, timeout=20)
    return _check(resp).json()[0]


def update(table: str, match: dict, values: dict) -> None:
    """PATCH rows where every column in match equals its value."""
    params = {k: f"eq.{v}" for k, v in match.items()}
    headers = _headers({"Prefer": "return=minimal"})
    resp = requests.patch(f"{_base()}/{table}", headers=headers, params=params, json=values, timeout=20)
    _check(resp)
