"""Score a run (runs/*.jsonl) against the labels in data/dataset.csv.

    python scripts/score.py runs/run-20261026-101500.jsonl
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from support_agent.evals import ALL  # noqa: E402


def main(run_path: str, dataset_path: str = str(ROOT / "data" / "dataset.csv")) -> None:
    expected = {r["id"]: r for r in csv.DictReader(open(dataset_path, newline=""))}
    results = [json.loads(line) for line in open(run_path)]
    totals = {fn.__name__: [] for fn in ALL}
    misses = []
    for r in results:
        exp = expected.get(r["id"])
        if not exp:
            continue
        for fn in ALL:
            out = fn(r, exp)
            if out["label"] != "n/a":
                totals[fn.__name__].append(out["score"])
            if out["score"] < 1:
                misses.append((r["id"], fn.__name__, out["label"]))
    print(f"{len(results)} emails  ·  model {results[0]['model'] if results else '?'}\n")
    for name, scores in totals.items():
        if scores:
            print(f"  {name:<26} {sum(scores) / len(scores):6.1%}  (n={len(scores)})")
    tokens = sum(r["input_tokens"] + r["output_tokens"] for r in results)
    print(f"\n  avg latency {sum(r['latency_s'] for r in results) / max(len(results), 1):.1f}s  ·  {tokens:,} tokens total")
    if misses:
        print("\nMisses:")
        for m in misses:
            print(f"  {m[0]:<6} {m[1]:<26} {m[2]}")


if __name__ == "__main__":
    main(*sys.argv[1:])
