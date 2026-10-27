"""Evaluators as plain functions of (result, expected row).

Each returns a score in [0, 1] plus a label, so the same definitions can be
used by scripts/score.py locally and as code evaluators in Arize experiments.
"""

from __future__ import annotations


def category_match(result: dict, expected: dict) -> dict:
    ok = result["category"] == expected["expected_category"]
    return {"score": float(ok), "label": "match" if ok else f"{expected['expected_category']}->{result['category']}"}


def urgency_match(result: dict, expected: dict) -> dict:
    ok = result["urgency"] == expected["expected_urgency"]
    return {"score": float(ok), "label": "match" if ok else f"{expected['expected_urgency']}->{result['urgency']}"}


def missed_urgent(result: dict, expected: dict) -> dict:
    """The costly mistake: an urgent email not flagged urgent. Score 0 = missed."""
    if expected["expected_urgency"] != "urgent":
        return {"score": 1.0, "label": "n/a"}
    caught = result["urgency"] == "urgent"
    return {"score": float(caught), "label": "caught" if caught else "MISSED"}


def false_alarm(result: dict, expected: dict) -> dict:
    """An alert on something that wasn't urgent. Annoying, not dangerous."""
    if expected["expected_urgency"] == "urgent":
        return {"score": 1.0, "label": "n/a"}
    alarm = result["urgency"] == "urgent"
    return {"score": 0.0 if alarm else 1.0, "label": "false alarm" if alarm else "ok"}


def answered_when_it_should(result: dict, expected: dict) -> dict:
    """Emails the bot can fully handle (bot_can_handle=y) shouldn't need a human; the rest should."""
    answerable = expected["bot_can_handle"].strip().lower() in ("y", "yes", "true", "1")
    ok = (not result["needs_human"]) if answerable else result["needs_human"]
    if ok:
        label = "ok"
    else:
        label = "punted to human" if answerable else "answered without a source"
    return {"score": float(ok), "label": label}


def cites_retrieved(result: dict, expected: dict) -> dict:
    """Every source the reply cites was actually retrieved during the run (a cheap groundedness proxy)."""
    if not result["draft_reply"] or not result["sources"]:
        return {"score": 1.0, "label": "n/a"}
    unknown = [s for s in result["sources"] if s not in result["retrieved"]]
    return {"score": 0.0 if unknown else 1.0, "label": f"cites unretrieved {unknown}" if unknown else "ok"}


def looked_up_account(result: dict, expected: dict) -> dict:
    """An agent-behavior check: did it investigate when the answer depended on the sender's account?"""
    if expected.get("should_look_up", "n") != "y":
        return {"score": 1.0, "label": "n/a"}
    looked = "lookup_account" in result["tool_calls"]
    return {"score": float(looked), "label": "investigated" if looked else "answered without checking the account"}


ALL = [category_match, urgency_match, missed_urgent, false_alarm, answered_when_it_should, cites_retrieved, looked_up_account]
