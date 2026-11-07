"""Run `task()` from experiment_task.py on every example of an exported Arize dataset.

    ax datasets export <dataset id> --space <space> --stdout > examples.json
    uv run --extra arize python scripts/run_experiment.py examples.json runs.json [--limit N]
    ax experiments create --name <name> --dataset <dataset id> --space <space> --file runs.json

Used instead of `ax experiments run`, which fails on this dataset because its
own `id` column (e01...) collides with Arize's example `id`.
"""

from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from experiment_task import task  # noqa: E402


def run_one(example: dict) -> dict:
    fields = example["additional_properties"]
    try:
        out = task(fields)
        return {"example_id": example["id"], "output": json.dumps(out)}
    except Exception as e:  # keep the run; a failed example shows up as an error output
        return {"example_id": example["id"], "output": json.dumps({"error": repr(e)})}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("examples")
    p.add_argument("runs")
    p.add_argument("--limit", type=int)
    p.add_argument("--concurrency", type=int, default=3)
    args = p.parse_args()

    examples = json.loads(Path(args.examples).read_text())[: args.limit]
    with ThreadPoolExecutor(args.concurrency) as pool:
        runs = list(pool.map(run_one, examples))
    Path(args.runs).write_text(json.dumps(runs))
    errors = sum('"error"' in r["output"][:12] for r in runs)
    print(f"{len(runs)} runs, {errors} errors -> {args.runs}", file=sys.stderr)


if __name__ == "__main__":
    main()
