"""Domi support triage agent."""

from . import tracing  # noqa: F401  first: sets ANTHROPIC_OPEN_TELEMETRY before anthropic loads
from .agent import Email, triage

__all__ = ["Email", "triage"]
