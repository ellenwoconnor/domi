# Domi support agent

Triage for email sent to **support@domicircles.com**. For each email the agent
decides what it is, how urgent it is, and drafts a reply from the official help
page. If someone may be in danger, it alerts the owner's phone.

Domi is a one-person app, so this is the support team. It starts in **shadow
mode**: it drafts and alerts, and a person sends every reply.

## How it works

```
email ──► Claude (tool loop, up to 6 turns)
            ├─ search_faq            web/src/faq.json, the file the help page is built from
            ├─ lookup_known_issues   data/known_issues.json
            ├─ lookup_account        data/accounts.json: the sender's circles, listings, requests, chats
            ├─ escalate              flags it for an alert
            └─ submit_triage         category · urgency · summary · draft · sources
        ──► urgency rules            data/urgency_rules.json: can raise to urgent, never lower
        ──► alert if urgent          ntfy push (dry run unless NTFY_TOPIC is set)
```

For bug and account reports, the agent investigates: it looks up the sender's
account and decides whether the data explains the report (a limit, an expiry,
a setting), shows the person did it themselves, or contradicts the report (a
likely bug), and writes its evidence in `findings` for the owner.

The model makes the judgment calls. The rules are a backstop so a model
mistake can't hide a safety report. The email is untrusted input: the agent
can only read the help page, flag, and draft. It can't send mail or change
accounts.

Everything the agent "knows" lives in plain files, so a later version
(hosted, or ported to TypeScript inside Convex) reads the same things:

| File | What |
| --- | --- |
| `prompts/system.md` | Instructions, categories, urgency definitions |
| `../web/src/faq.json` | The FAQ, shared with the help page at domicircles.com/support. Edit answers there; redeploy the website to publish them |
| `data/known_issues.json` | Known bugs and limitations, with workarounds |
| `data/accounts.json` | Fake accounts shaped like Domi's real data, keyed by the user id in the in-app feedback email's footer. In production, a read-only Convex query returns the same shape |
| `data/urgency_rules.json` | Deterministic "always urgent" patterns and categories |
| `data/dataset.csv` | 42 labeled test emails. Columns: `expected_category`, `expected_urgency`, `bot_can_handle` (y if the bot can fully resolve it), `should_look_up` (y if the answer depends on the sender's account), `notes` (what the row tests) |
| `support_agent/evals.py` | Evaluators, usable locally and in Arize experiments |

## Setup

```sh
cd support-agent
uv sync                      # or: python -m venv .venv && pip install -e .
cp .env.example .env         # add ANTHROPIC_API_KEY
```

## Run

```sh
uv run python -m support_agent "How do I leave a circle?" --from-name Lena
uv run python -m support_agent --dataset data/dataset.csv --limit 5
uv run python -m support_agent --dataset data/dataset.csv --model claude-sonnet-5-5
uv run python scripts/score.py runs/<run file>.jsonl
uv run pytest                # offline tests, no API key needed
```

`score.py` reports category and urgency accuracy, **missed urgent** emails (the
costly mistake), false alarms, whether it answered when it should (and punted
when it should), whether cited sources were actually retrieved, and whether it
looked up the account when the answer depended on it.

## The dataset

42 synthetic but realistic emails: FAQ questions, questions the FAQ doesn't
cover (the bot should hand off, not guess), bugs with and without app info,
account problems, safety reports (including one buried in a polite how-to
question, and one with no obvious keywords), a police records request, angry
but not urgent feedback, spam, phishing, a prompt-injection attempt, and an
email with two issues. Two rows (`e37`, `e38`) are known traps where the
keyword rules over-fire. The `notes` column says what each row tests.

## Arize AX (to do)

Left for hands-on exploration. See `support_agent/tracing.py` for a starting
point.

**Development workflow**
- [ ] Upload `data/dataset.csv` as a dataset
- [ ] Experiment: baseline prompt vs. a prompt variant (Prompt Playground and code)
- [ ] Experiment: `claude-haiku-5-5` vs. `claude-sonnet-5-5`
- [ ] Evals on experiments: the code evals in `evals.py`, plus an LLM judge for "is the draft grounded in the retrieved FAQ"

**Observability workflow**
- [ ] Tracing: Claude calls, plus spans for tools and the rules step
- [ ] Simulated traffic (run the dataset a few times, or generate more emails)
- [ ] Online evals for groundedness and urgency
- [ ] Find a bad trace → add it to the dataset → fix → re-run the experiment

Keep notes in `FRICTION_LOG.md` as you go.

## Path to production

1. Cloudflare Email Routing forwards support@ to Gmail (works with no bot).
2. Route support@ to an Email Worker that forwards a copy to Gmail and POSTs the parsed email to the agent.
3. The agent runs on a small Python host, or is ported to a Convex action with the same data files. The dataset is the bar the production version has to meet.
4. Shadow mode first. Auto-send only FAQ-covered replies once the numbers support it.
