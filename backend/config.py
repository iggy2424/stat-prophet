"""Environment settings.

On Vercel, values come from the project's environment variables. Locally, the dev
scripts call load_local_env() first, which reads the gitignored .env file.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_local_env(filename: str = ".env") -> None:
    """Load KEY=value lines from a local env file without overriding real env vars."""
    path = ROOT / filename
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'").replace("\\n", "").strip()
        os.environ.setdefault(key.strip(), value)


def get(name: str, required: bool = True) -> str:
    value = os.environ.get(name, "")
    if required and not value:
        raise RuntimeError(f"Missing environment variable {name}")
    return value


def is_dev() -> bool:
    """True only when running through scripts/dev_server.py. Never set this on Vercel."""
    return os.environ.get("TB_DEV") == "1"
