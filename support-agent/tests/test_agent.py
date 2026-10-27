"""Offline tests: knowledge lookups, urgency rules, and the agent loop with a fake Claude client."""

import csv
from pathlib import Path
from types import SimpleNamespace as NS

from support_agent import Email, knowledge, triage
from support_agent.evals import ALL, missed_urgent

ROOT = Path(__file__).resolve().parent.parent


def test_faq_loads_from_shared_file():
    entries = knowledge.faq()
    assert len(entries) >= 30
    assert all({"id", "question", "answer"} <= e.keys() for e in entries)


def test_search_faq_finds_obvious_entries():
    assert knowledge.search_faq("how do I leave a circle")[0]["id"].startswith("circles")
    assert any("Delete account" in e["answer"] for e in knowledge.search_faq("delete my account"))


def test_known_issues_match_symptoms():
    assert [i["id"] for i in knowledge.lookup_known_issues("the invite link isn't working")] == ["invite-regenerated"]


def test_lookup_account_returns_the_senders_data_or_not_found():
    dev = knowledge.lookup_account("k6dev")
    assert dev["found"] and sum(r["status"] == "open" for r in dev["requests"]) == 5
    assert knowledge.lookup_account("nobody")["found"] is False


def test_dataset_user_ids_exist_except_the_not_found_case():
    import re

    rows = list(csv.DictReader(open(ROOT / "data" / "dataset.csv", newline="")))
    ids = {m.group(1) for r in rows if (m := re.search(r"· user (\w+)", r["body"]))}
    assert ids - set(knowledge.accounts()) == {"k16chris"}


def test_rules_catch_danger_and_ignore_ordinary_mail():
    assert knowledge.rule_matches("he has shown up at my door twice")
    assert knowledge.rule_matches("I'm a lawyer representing")
    assert not knowledge.rule_matches("How do I leave a circle?")
    assert not knowledge.rule_matches("Can I give away a hot glue gun?")


def test_dataset_labels_are_valid():
    rows = list(csv.DictReader(open(ROOT / "data" / "dataset.csv", newline="")))
    assert len(rows) >= 40
    from support_agent.tools import CATEGORIES, URGENCIES

    for r in rows:
        assert r["expected_category"] in CATEGORIES, r["id"]
        assert r["expected_urgency"] in URGENCIES, r["id"]
        assert r["bot_can_handle"] in ("y", "n"), r["id"]
        assert r["should_look_up"] in ("y", "n"), r["id"]


# --- the loop, with a scripted fake client ---


def tool_use(id, name, input):
    return NS(type="tool_use", id=id, name=name, input=input)


class FakeClient:
    """Returns scripted responses in order and records what the agent sent."""

    def __init__(self, *turns):
        self.turns = list(turns)
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return NS(content=self.turns.pop(0), usage=NS(input_tokens=100, output_tokens=20))


SUBMIT = {
    "category": "question",
    "urgency": "normal",
    "summary": "Wants to leave a circle",
    "needs_human": False,
    "findings": "",
    "draft_reply": "Hi Lena, open the circle and tap Leave this circle. - Domi support",
    "sources": ["circles-5"],
}


def test_loop_can_investigate_the_account():
    client = FakeClient(
        [tool_use("t1", "lookup_account", {"user_id": "k6dev"})],
        [tool_use("t2", "submit_triage", {**SUBMIT, "findings": "5 open requests: cap working as designed"})],
    )
    r = triage(Email(body="It won't let me request anything... user k6dev"), client=client, model="fake")
    assert r.accounts_checked == ["k6dev"]
    assert r.findings.startswith("5 open requests")
    sent_back = client.calls[1]["messages"][2]["content"][0]["content"]
    assert '"found": true' in sent_back


def test_loop_searches_then_submits():
    client = FakeClient(
        [tool_use("t1", "search_faq", {"query": "leave circle"})],
        [tool_use("t2", "submit_triage", SUBMIT)],
    )
    r = triage(Email(body="How do I leave a circle?", from_name="Lena"), client=client, model="fake")
    assert r.category == "question" and r.urgency == "normal" and not r.needs_human
    assert "circles-5" in r.retrieved
    assert r.tool_calls == ["search_faq", "submit_triage"]
    # the tool result was sent back to the model
    assert client.calls[1]["messages"][2]["content"][0]["type"] == "tool_result"
    assert r.alert is None


def test_rules_override_model_urgency_and_alert_in_dry_run(monkeypatch):
    monkeypatch.delenv("NTFY_TOPIC", raising=False)
    client = FakeClient([tool_use("t1", "submit_triage", {**SUBMIT, "category": "question", "urgency": "normal"})])
    r = triage(Email(body="How do I block someone? He showed up at my door again."), client=client, model="fake")
    assert r.model_urgency == "normal" and r.urgency == "urgent"
    assert r.needs_human
    assert r.rule_hits[0]["id"] == "threat-or-danger"
    assert r.alert == {"sent": False, "dry_run": True, "title": "Domi support: question"}


def test_forces_submit_on_last_turn():
    from support_agent import agent

    turns = [[tool_use(f"t{i}", "search_faq", {"query": "x"})] for i in range(agent.MAX_TURNS - 1)]
    turns.append([tool_use("last", "submit_triage", SUBMIT)])
    client = FakeClient(*turns)
    r = triage(Email(body="hi"), client=client, model="fake")
    assert client.calls[-1]["tool_choice"] == {"type": "tool", "name": "submit_triage"}
    assert r.turns == agent.MAX_TURNS


def test_evals_flag_a_missed_urgent_email():
    result = {"category": "question", "urgency": "normal", "needs_human": False, "draft_reply": "x", "sources": [], "retrieved": [], "tool_calls": []}
    expected = {"expected_category": "safety", "expected_urgency": "urgent", "bot_can_handle": "n", "should_look_up": "y"}
    assert missed_urgent(result, expected)["label"] == "MISSED"
    assert all("score" in fn(result, expected) for fn in ALL)
