"""Expo push notifications — best-effort device delivery for in-app
notifications so users are alerted even when the app is fully closed.

Pairs with the in-app surface in `notify.create_notification` (DB row +
Redis fan-out). This module only adds the OS-level push; a failure here
never affects the notification row or the caller's transaction.

Device tokens are stored in `user_push_tokens` (created at gateway
startup). The mobile client registers via POST /api/v1/profile/push-token.
"""
import logging
import os
import re

import httpx
from sqlalchemy import text

from . import tenant_brand
from .database import AsyncSessionLocal
from .tenant_brand import PLATFORM_BRAND_NAME

logger = logging.getLogger("push")

_PLATFORM_NAME_RE = re.compile(r"SpeedTrader|SpeedTrade|Speedtrade|SPEEDTRADE|TuskaEx|Tuskaex|TUSKAEX")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_expo_token(t) -> bool:
    return isinstance(t, str) and (
        t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")
    )


async def _brand_for_recipient(user_id, title, body, db):
    """For a white-label broker's client: default the title to the broker's
    name and swap the platform name in title/body. Platform users: returned
    untouched. Never raises."""
    try:
        owner = await tenant_brand.tenant_owner_for_id(user_id, db)
        if owner is None:
            return title, body
        name = tenant_brand.display_name(owner) or "Notification"

        def swap(v):
            return _PLATFORM_NAME_RE.sub(lambda _m: name, v) if v else v

        return (swap(title) or name), swap(body)
    except Exception as e:  # pragma: no cover
        logger.warning("push branding lookup failed: %s", e)
        return title, body


async def send_push_to_user(user_id, title: str, body: str, data: dict | None = None) -> None:
    """Deliver a push to every Expo token registered for `user_id`.
    Fully best-effort — swallows all errors."""
    try:
        async with AsyncSessionLocal() as db:
            rows = await db.execute(
                text("SELECT token FROM user_push_tokens WHERE user_id = :uid"),
                {"uid": str(user_id)},
            )
            tokens = [r[0] for r in rows.all() if _is_expo_token(r[0])]
            if not tokens:
                return
            title, body = await _brand_for_recipient(user_id, title, body, db)

        messages = [
            {
                "to": tok,
                "title": title or PLATFORM_BRAND_NAME,
                "body": body or "",
                "data": data or {},
                "sound": "default",
                "channelId": "default",
                "priority": "high",
            }
            for tok in tokens
        ]
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        access = os.environ.get("EXPO_ACCESS_TOKEN")
        if access:
            headers["Authorization"] = f"Bearer {access}"

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(EXPO_PUSH_URL, json=messages, headers=headers)
            if resp.status_code == 200:
                await _prune_invalid(resp.json(), tokens)
            else:
                logger.warning("Expo push HTTP %s: %s", resp.status_code, resp.text[:200])
    except Exception as e:  # pragma: no cover
        logger.warning("push send failed: %s", e)


async def _prune_invalid(payload, tokens) -> None:
    """Drop tokens Expo flags as DeviceNotRegistered so we stop pushing to
    uninstalled apps / stale devices."""
    try:
        items = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(items, list):
            return
        dead = []
        for tok, item in zip(tokens, items):
            if isinstance(item, dict) and item.get("status") == "error":
                if (item.get("details") or {}).get("error") == "DeviceNotRegistered":
                    dead.append(tok)
        if dead:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("DELETE FROM user_push_tokens WHERE token = ANY(:toks)"),
                    {"toks": dead},
                )
                await db.commit()
    except Exception:  # pragma: no cover
        pass
