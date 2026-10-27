"""Command line:

    python -m support_agent "I can't leave my circle"            # one email, body only
    python -m support_agent --subject "Help" --file email.txt      # body from a file
    python -m support_agent --dataset data/dataset.csv --limit 5   # run the dataset, save JSONL to runs/
    python -m support_agent --dataset data/dataset.csv --only e06,e19,e20   # just these rows
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from .agent import Email, triage
from .tracing import setup_tracing

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    load_dotenv(ROOT / ".env")
    p = argparse.ArgumentParser(prog="support_agent")
    p.add_argument("body", nargs="?", help="Email body")
    p.add_argument("--subject", default="")
    p.add_argument("--from-name", default="")
    p.add_argument("--file", help="Read the email body from a file")
    p.add_argument("--dataset", help="CSV with from_name, subject, body columns (e.g. data/dataset.csv)")
    p.add_argument("--limit", type=int)
    p.add_argument("--only", help="Comma-separated row ids to run, e.g. e06,e19,e20")
    p.add_argument("--model")
    p.add_argument("--send-alerts", action="store_true", help="Actually send ntfy alerts (default: dry run)")
    args = p.parse_args()

    setup_tracing()

    if args.dataset:
        rows = list(csv.DictReader(open(args.dataset, newline="")))
        if args.only:
            wanted = set(args.only.split(","))
            rows = [r for r in rows if r["id"] in wanted]
        rows = rows[: args.limit]
        out = ROOT / "runs" / f"run-{time.strftime('%Y%m%d-%H%M%S')}.jsonl"
        out.parent.mkdir(exist_ok=True)
        with out.open("w") as f:
            for i, row in enumerate(rows, 1):
                email = Email(body=row["body"], subject=row.get("subject", ""), from_name=row.get("from_name", ""))
                r = triage(email, model=args.model, send_alerts=args.send_alerts)
                f.write(json.dumps({"id": row.get("id"), **r.to_dict()}) + "\n")
                print(f"[{i}/{len(rows)}] {row.get('id')}: {r.category}/{r.urgency}  {r.summary}", file=sys.stderr)
        print(f"Saved {out.relative_to(ROOT)}.  Score it: python scripts/score.py {out.relative_to(ROOT)}", file=sys.stderr)
        return

    body = Path(args.file).read_text() if args.file else args.body
    if not body:
        p.error("give an email body, --file, or --dataset")
    r = triage(Email(body=body, subject=args.subject, from_name=args.from_name), model=args.model, send_alerts=args.send_alerts)
    print(json.dumps(r.to_dict(), indent=2))


if __name__ == "__main__":
    main()
