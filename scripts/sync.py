"""Run a sync job from the command line, using secrets from .env.

  python scripts/sync.py teams
  python scripts/sync.py schedule
  python scripts/sync.py scores
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import config, sync  # noqa: E402

config.load_local_env()

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in sync.JOBS:
        sys.exit(f"usage: python scripts/sync.py [{'|'.join(sync.JOBS)}]")
    result = sync.run_job(sys.argv[1], sync.JOBS[sys.argv[1]])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["ok"] else 1)
