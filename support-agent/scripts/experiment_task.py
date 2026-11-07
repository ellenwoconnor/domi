"""Task for Arize experiments: runs `triage()` on one dataset row.

    uv run --extra arize --with arize-ax-cli ax experiments run \
        -n haiku-baseline --dataset <dataset id> --task scripts/experiment_task.py

Runs ax inside this project's environment so `support_agent` and `anthropic`
import. Model and prompt come from .env / defaults, as in the CLI. Alerts are
never sent. Tracing is not set up here, so experiment runs don't mix with the
traces in the domi-support-agent project.
"""

from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from support_agent import Email, triage  # noqa: E402


def task(dataset_row) -> dict:
    row = dataset_row if isinstance(dataset_row, dict) else dict(dataset_row)
    fields = row.get("additional_properties") or row
    email = Email(body=fields["body"], subject=fields.get("subject") or "", from_name=fields.get("from_name") or "")
    return triage(email, send_alerts=False).to_dict()
