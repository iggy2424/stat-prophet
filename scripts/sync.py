"""Run a sync job from the command line, using secrets from .env.

  python scripts/sync.py teams
  python scripts/sync.py schedule [season]        e.g. schedule 2025 for last season
  python scripts/sync.py scores
  python scripts/sync.py live
  python scripts/sync.py boxscores [season] [limit]   team totals (API-Sports)
  python scripts/sync.py players [season] [limit]     player stats (BallDontLie)
  python scripts/sync.py boxscores 2025 --all         repeat while each run still saves rows
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import config, sync  # noqa: E402

config.load_local_env()

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] not in sync.JOBS:
        sys.exit(__doc__)
    job, repeat = args[0], "--all" in args
    extra = [int(a) for a in args[1:] if a != "--all"]

    while True:
        result = sync.run_job(job, *extra)
        print(json.dumps(result, indent=2))
        if not repeat or result["rows_written"] == 0:
            break
    sys.exit(0 if result["ok"] else 1)
