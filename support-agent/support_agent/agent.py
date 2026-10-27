"""The triage loop: Claude with tools, then deterministic urgency rules.

    result = triage(Email(subject="...", body="..."))

Flow:
  1. Claude reads the email and calls search_faq / lookup_known_issues /
     lookup_account / escalate as it sees fit (up to MAX_TURNS rounds).
  2. It finishes with submit_triage (forced if it hasn't by the last turn).
  3. Urgency rules from data/urgency_rules.json run on the raw email. They can
     raise urgency to "urgent", never lower it.
  4. If the result is urgent, one alert goes to the owner (dry run by default).
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass, field

import anthropic

from . import knowledge
from .alerts import send_alert
from .tools import TOOLS, run_tool
from .tracing import span

DEFAULT_MODEL = "claude-haiku-5-5"
MAX_TURNS = 6
TOOL_SPECS = {t["name"]: t for t in TOOLS}


@dataclass
class Email:
    body: str
    subject: str = ""
    from_name: str = ""
    from_email: str = ""

    def as_prompt(self) -> str:
        sender = f"{self.from_name} <{self.from_email}>".strip(" <>") or "unknown"
        return f"From: {sender}\nSubject: {self.subject}\n\n{self.body}"


@dataclass
class TriageResult:
    category: str
    urgency: str
    summary: str
    needs_human: bool
    findings: str
    draft_reply: str
    sources: list[str]
    model_urgency: str  # what the model said, before rules
    rule_hits: list[dict] = field(default_factory=list)
    escalations: list[dict] = field(default_factory=list)
    retrieved: list[str] = field(default_factory=list)
    accounts_checked: list[str] = field(default_factory=list)
    retrieved_context: str = ""  # the text of everything the tools returned, for groundedness evals
    alert: dict | None = None
    tool_calls: list[str] = field(default_factory=list)
    turns: int = 0
    model: str = ""
    latency_s: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


def triage(
    email: Email,
    *,
    model: str | None = None,
    system_prompt: str | None = None,
    client: anthropic.Anthropic | None = None,
    send_alerts: bool | None = None,
) -> TriageResult:
    """Triage one email. `system_prompt` lets experiments swap in a prompt variant."""
    with span("triage", "AGENT", email.as_prompt()) as s:
        result = _triage(email, model=model, system_prompt=system_prompt, client=client, send_alerts=send_alerts)
        s.set_attribute("output.value", json.dumps(result.to_dict()))
        s.set_attribute("output.mime_type", "application/json")
        s.set_attribute("metadata", json.dumps({"category": result.category, "urgency": result.urgency, "model": result.model}))
        # Flat fields for evals: the reply to check, and the reference text it should be grounded in.
        s.set_attribute("support.draft_reply", result.draft_reply)
        s.set_attribute("support.retrieved_context", result.retrieved_context or "(nothing retrieved)")
        return result


def _triage(
    email: Email,
    *,
    model: str | None,
    system_prompt: str | None,
    client: anthropic.Anthropic | None,
    send_alerts: bool | None,
) -> TriageResult:
    client = client or anthropic.Anthropic()
    model = model or os.environ.get("SUPPORT_AGENT_MODEL") or DEFAULT_MODEL
    system = system_prompt or knowledge.system_prompt()
    state: dict = {"retrieved": [], "escalations": [], "tool_calls": [], "accounts_checked": [], "context": []}
    messages: list[dict] = [{"role": "user", "content": email.as_prompt()}]
    final: dict | None = None
    usage = {"in": 0, "out": 0}
    started = time.monotonic()

    turn = 0
    for turn in range(1, MAX_TURNS + 1):
        force = turn == MAX_TURNS
        res = client.messages.create(
            model=model,
            max_tokens=1500,
            system=system,
            tools=TOOLS,
            tool_choice={"type": "tool", "name": "submit_triage"} if force else {"type": "auto"},
            messages=messages,
        )
        usage["in"] += res.usage.input_tokens
        usage["out"] += res.usage.output_tokens
        messages.append({"role": "assistant", "content": res.content})

        tool_uses = [b for b in res.content if b.type == "tool_use"]
        if not tool_uses:
            # Answered in prose instead of calling a tool: ask for the structured result.
            messages.append({"role": "user", "content": "Call submit_triage with your result."})
            continue

        results = []
        for tu in tool_uses:
            state["tool_calls"].append(tu.name)
            if tu.name == "submit_triage":
                final = dict(tu.input)
                results.append({"type": "tool_result", "tool_use_id": tu.id, "content": "Recorded."})
            else:
                spec = TOOL_SPECS.get(tu.name, {})
                with span(tu.name, "TOOL", json.dumps(tu.input), {
                    "input.mime_type": "application/json",
                    "tool.name": tu.name,
                    "tool.description": spec.get("description", ""),
                    "tool.parameters": json.dumps(spec.get("input_schema", {})),
                    "tool.id": tu.id,
                }) as s:
                    out = run_tool(tu.name, dict(tu.input), state)
                    s.set_attribute("output.value", json.dumps(out))
                    s.set_attribute("output.mime_type", "application/json")
                results.append({"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(out)})
        if final is not None:
            break
        messages.append({"role": "user", "content": results})

    if final is None:  # shouldn't happen given the forced last turn, but never drop an email
        final = {"category": "feedback", "urgency": "normal", "summary": "Agent did not finish triage", "needs_human": True, "findings": "", "draft_reply": "", "sources": []}

    return _finish(email, final, state, model, turn, usage, time.monotonic() - started, send_alerts)


def _finish(email: Email, final: dict, state: dict, model: str, turns: int, usage: dict, latency: float, send_alerts: bool | None) -> TriageResult:
    text = f"{email.subject}\n{email.body}"
    with span("urgency_rules", "CHAIN", text) as s:
        rule_hits = knowledge.rule_matches(text)
        rules = knowledge.urgency_rules()
        urgency = final.get("urgency", "normal")
        model_urgency = urgency
        if rule_hits or final.get("category") in rules["always_urgent_categories"] or state["escalations"]:
            urgency = "urgent"
        s.set_attribute("output.value", json.dumps({"model_urgency": model_urgency, "urgency": urgency, "rule_hits": [h["id"] for h in rule_hits]}))
        s.set_attribute("output.mime_type", "application/json")
    for hit in rule_hits:
        state["escalations"].append({"by": f"rule:{hit['id']}", "reason": hit["reason"]})

    result = TriageResult(
        category=final.get("category", "feedback"),
        urgency=urgency,
        summary=final.get("summary", ""),
        needs_human=bool(final.get("needs_human", True)) or urgency == "urgent",
        findings=final.get("findings", ""),
        draft_reply=final.get("draft_reply", ""),
        sources=list(final.get("sources", [])),
        model_urgency=model_urgency,
        rule_hits=rule_hits,
        escalations=state["escalations"],
        retrieved=list(dict.fromkeys(state["retrieved"])),
        accounts_checked=state["accounts_checked"],
        retrieved_context="\n\n".join(dict.fromkeys(state["context"])),
        tool_calls=state["tool_calls"],
        turns=turns,
        model=model,
        latency_s=round(latency, 2),
        input_tokens=usage["in"],
        output_tokens=usage["out"],
    )
    if urgency == "urgent":
        reasons = "; ".join(e["reason"] for e in result.escalations) or result.summary
        result.alert = send_alert(f"Domi support: {result.category}", f"{result.summary}\n\nWhy: {reasons}", dry_run=None if send_alerts is None else not send_alerts)
    return result
