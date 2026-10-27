"""Urgent alerts to the owner's phone via ntfy.sh (https://ntfy.sh).

Set NTFY_TOPIC to a long random topic name and subscribe to it in the ntfy
app. Without it, alerts are only logged (dry run), which is what you want
while running datasets and experiments.
"""

from __future__ import annotations

import os
import urllib.request


def send_alert(title: str, message: str, *, dry_run: bool | None = None) -> dict:
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if dry_run is None:
        dry_run = not topic
    if dry_run:
        return {"sent": False, "dry_run": True, "title": title}
    req = urllib.request.Request(
        f"https://ntfy.sh/{topic}",
        data=message.encode(),
        headers={"Title": title.encode("ascii", "ignore").decode(), "Priority": "high", "Tags": "rotating_light"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        return {"sent": res.status == 200, "dry_run": False, "title": title}
