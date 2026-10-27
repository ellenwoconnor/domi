"""Arize AX tracing (OpenInference spans over OpenTelemetry).

`setup_tracing()` registers the Arize exporter and instruments the Anthropic
SDK, so every Claude call becomes an LLM span. The tool calls and the
urgency-rules step run in plain Python, so agent.py wraps them with `span()`:

    triage (AGENT)
      ├─ Messages (LLM)          one per turn, from the instrumentor
      ├─ search_faq (TOOL)       one per tool execution
      └─ urgency_rules (CHAIN)

Tracing is on only when ARIZE_SPACE_ID and ARIZE_API_KEY are set and the
`arize` extra is installed (uv sync --extra arize). Otherwise `span()` is a
no-op, so tests and runs without Arize work as before.
"""

from __future__ import annotations

import atexit
import os
import sys
from contextlib import contextmanager
from typing import Any, Iterator

# The Anthropic SDK emits its own OpenTelemetry spans when a global provider
# exists; turn those off so each call is traced once, by the instrumentor.
# Must run before `anthropic` is imported (support_agent/__init__.py imports
# this module first).
os.environ.setdefault("ANTHROPIC_OPEN_TELEMETRY", "false")

_provider = None


def setup_tracing() -> bool:
    """Return True once tracing is configured. Called at startup by the CLI."""
    global _provider
    if _provider is not None:
        return True
    if not (os.environ.get("ARIZE_SPACE_ID") and os.environ.get("ARIZE_API_KEY")):
        return False
    try:
        from arize.otel import register
        from openinference.instrumentation.anthropic import AnthropicInstrumentor
    except ImportError:
        print("Arize tracing is off: install it with `uv sync --extra arize`.", file=sys.stderr)
        return False

    _provider = register(
        space_id=os.environ["ARIZE_SPACE_ID"],
        api_key=os.environ["ARIZE_API_KEY"],
        project_name=os.environ.get("ARIZE_PROJECT_NAME", "domi-support-agent"),
        verbose=False,
    )
    AnthropicInstrumentor().instrument(tracer_provider=_provider)
    atexit.register(_shutdown)  # the CLI is short-lived: export spans before exit
    return True


def _shutdown() -> None:
    if _provider is not None:
        _provider.force_flush()
        _provider.shutdown()


class _NoSpan:
    def set_attribute(self, key: str, value: Any) -> None:
        pass


@contextmanager
def span(name: str, kind: str, input_value: str, attributes: dict | None = None) -> Iterator[Any]:
    """An OpenInference span (kind AGENT, TOOL, CHAIN, ...) around a block.

    The caller sets "output.value". Status is OK when the block finishes, and
    ERROR (with the exception) when it raises.
    """
    if _provider is None:
        yield _NoSpan()
        return
    from opentelemetry.trace import Status, StatusCode

    with _provider.get_tracer("support_agent").start_as_current_span(name) as s:
        s.set_attribute("openinference.span.kind", kind)
        s.set_attribute("input.value", input_value)
        for key, value in (attributes or {}).items():
            s.set_attribute(key, value)
        yield s
        s.set_status(Status(StatusCode.OK))
