"""Tool definitions the model sees, and the Python that runs them."""

from __future__ import annotations

import json

from . import knowledge

CATEGORIES = ["question", "bug", "account", "safety", "legal", "feedback", "spam"]
URGENCIES = ["urgent", "normal", "low"]

TOOLS = [
    {
        "name": "search_faq",
        "description": "Search Domi's official help page (domicircles.com/support). The only allowed source for facts about how Domi works. Returns up to 3 entries with ids.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Short keywords, e.g. 'leave circle' or 'delete account'"}},
            "required": ["query"],
        },
    },
    {
        "name": "lookup_known_issues",
        "description": "Check a reported problem against bugs and limitations we already know about. Returns matching issues with a workaround.",
        "input_schema": {
            "type": "object",
            "properties": {"symptoms": {"type": "string", "description": "What the person says is going wrong"}},
            "required": ["symptoms"],
        },
    },
    {
        "name": "lookup_account",
        "description": "Look up the sender's own Domi account: profile, circles (and ones they left), their listings with status and dates, their requests, their chats, and whether notifications are set up. Use it when the email has a user id (in the 'Sent from Domi ... user <id>' footer) and the answer depends on what actually happened in their account. Read-only.",
        "input_schema": {
            "type": "object",
            "properties": {"user_id": {"type": "string", "description": "The id after 'user' in the email footer, e.g. k6dev"}},
            "required": ["user_id"],
        },
    },
    {
        "name": "escalate",
        "description": "Send an urgent push alert to Domi's owner. Use only when someone may be in danger or harassed, a minor may be involved, private data may be exposed, there's a legal matter, or many people can't use the app.",
        "input_schema": {
            "type": "object",
            "properties": {"reason": {"type": "string", "description": "One line: what's urgent and why"}},
            "required": ["reason"],
        },
    },
    {
        "name": "submit_triage",
        "description": "Submit the final triage. Call exactly once, last.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": CATEGORIES},
                "urgency": {"type": "string", "enum": URGENCIES},
                "summary": {"type": "string", "description": "One line for the owner's inbox"},
                "needs_human": {"type": "boolean", "description": "True if the FAQ and known issues don't fully answer it, or the owner must act"},
                "findings": {"type": "string", "description": "For the owner: what the account data showed and what you concluded (expected behavior, user error, or likely bug, with the evidence). Empty if you didn't look anything up"},
                "draft_reply": {"type": "string", "description": "Reply to the sender, or empty for spam"},
                "sources": {"type": "array", "items": {"type": "string"}, "description": "FAQ entry ids and known-issue ids the reply relies on"},
            },
            "required": ["category", "urgency", "summary", "needs_human", "findings", "draft_reply", "sources"],
        },
    },
]


def run_tool(name: str, args: dict, state: dict) -> dict:
    """Execute a non-final tool. `state` collects what happened for the result."""
    if name == "search_faq":
        hits = knowledge.search_faq(args.get("query", ""))
        state["retrieved"].extend(h["id"] for h in hits)
        state["context"].extend(f"[{h['id']}] Q: {h['question']}\nA: {h['answer']}" for h in hits)
        return {"results": [{"id": h["id"], "question": h["question"], "answer": h["answer"]} for h in hits]}
    if name == "lookup_known_issues":
        hits = knowledge.lookup_known_issues(args.get("symptoms", ""))
        state["retrieved"].extend(h["id"] for h in hits)
        state["context"].extend(f"[{h['id']}] Known issue: {h['title']}. {h['workaround']}" for h in hits)
        return {"results": hits}
    if name == "lookup_account":
        out = knowledge.lookup_account(args.get("user_id", ""))
        state["accounts_checked"].append(args.get("user_id", ""))
        state["context"].append(f"[account {args.get('user_id', '')}] {json.dumps(out)}")
        return out
    if name == "escalate":
        state["escalations"].append({"by": "model", "reason": args.get("reason", "")})
        return {"ok": True, "note": "Owner will be alerted. Continue, then call submit_triage."}
    return {"error": f"Unknown tool {name}"}
