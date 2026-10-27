"""The agent's shared knowledge: the FAQ, known issues, urgency rules and account data.

The FAQ is web/src/faq.json, the same file the help page
(domicircles.com/support) is built from, so the bot and the page always agree.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
PROMPTS = Path(__file__).resolve().parent.parent / "prompts"

_STOP = set(
    "a an and are as at be but by can do does for from get got have how i if in is it its me my "
    "of on or so that the their them then there they this to was we what when where which who "
    "why will with you your i'm im it's dont don't cant can't".split()
)


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    # crude stemming so "listing"/"listings", "blocked"/"block" match
    return [re.sub(r"(ing|ed|es|s)$", "", w) or w for w in words if w not in _STOP and len(w) > 1]


FAQ_FILE = Path(__file__).resolve().parents[2] / "web" / "src" / "faq.json"


@lru_cache
def faq() -> list[dict]:
    """Flatten faq.json into [{id, section, question, answer}]. Ids like "circles-5" are what replies cite."""
    sections = json.loads(FAQ_FILE.read_text())["sections"]
    return [
        {"id": f"{s['id']}-{n}", "section": s["title"], "question": item["q"], "answer": item["a"]}
        for s in sections
        for n, item in enumerate(s["items"], 1)
    ]


@lru_cache
def known_issues() -> list[dict]:
    return json.loads((DATA / "known_issues.json").read_text())["issues"]


@lru_cache
def accounts() -> dict:
    return json.loads((DATA / "accounts.json").read_text())["users"]


def lookup_account(user_id: str) -> dict:
    """The sender's own account: profile, circles, listings, requests, chats.

    Reads data/accounts.json (fake accounts) for now. In production this becomes
    a read-only Convex query returning the same shape, for the sender only.
    """
    account = accounts().get(user_id.strip())
    if account is None:
        return {"found": False, "user_id": user_id, "note": "No account with this id. Don't guess; say a person will look into it."}
    return {"found": True, "user_id": user_id, **account}


@lru_cache
def urgency_rules() -> dict:
    return json.loads((DATA / "urgency_rules.json").read_text())


@lru_cache
def system_prompt() -> str:
    return (PROMPTS / "system.md").read_text()


def search_faq(query: str, k: int = 3) -> list[dict]:
    """Keyword search over the FAQ. Question words count double.

    Deliberately simple: when it misses, that shows up in traces as a
    retrieval failure, which is a useful thing to find and fix.
    """
    q = set(_tokens(query))
    if not q:
        return []
    scored = []
    for e in faq():
        qt, at = set(_tokens(e["question"])), set(_tokens(e["answer"]))
        score = 2 * len(q & qt) + len(q & at)
        if score:
            scored.append((score, e))
    scored.sort(key=lambda s: -s[0])
    return [e for _, e in scored[:k]]


def lookup_known_issues(query: str) -> list[dict]:
    """Known issues whose symptoms appear in the query, or that share 2+ keywords with it."""
    text, q = query.lower(), set(_tokens(query))
    hits = []
    for issue in known_issues():
        words = set(_tokens(issue["title"] + " " + " ".join(issue["symptoms"])))
        if any(s in text for s in issue["symptoms"]) or len(q & words) >= 2:
            hits.append(issue)
    return hits


def rule_matches(text: str) -> list[dict]:
    """Urgency rules whose patterns match the text."""
    hits = []
    for rule in urgency_rules()["rules"]:
        if any(re.search(p, text, re.IGNORECASE) for p in rule["patterns"]):
            hits.append({"id": rule["id"], "reason": rule["reason"]})
    return hits
