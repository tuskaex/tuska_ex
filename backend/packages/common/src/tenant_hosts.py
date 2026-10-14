"""Which hostnames a white-label tenant serves on, and which apex owns each.

Three consumers need this answer and none of them can ask the database at the
moment they need it:

  * the dynamic CORS middleware — a tenant's domain is added by a customer long
    after CORS_ORIGINS was written into the environment, so the static allow-list
    can never contain it. Without this the browser blocks every call from
    broker.com and the tenant's site is a blank shell.
  * `auth_service._cookie_domain` — synchronous, no session in scope. It needs to
    know that `app.broker.com` and `trade.broker.com` share the apex
    `broker.com`, so one cookie covers both and the terminal does not need a
    cross-domain handoff.
  * `tenant_resolver` — attributing a signup to the tenant whose domain it
    arrived on.

So the refresh is async and the read is synchronous against a module-level
snapshot. The CORS middleware is registered outermost and therefore runs before
any handler, which is what keeps the snapshot warm for the request that is about
to set cookies. A cold snapshot degrades to "not a tenant", which is the exact
behaviour that existed before this module — never a wrong answer, only a
temporarily incomplete one.

The TTL is deliberately short. A tenant that has just been marked READY should
start working within a minute without anyone restarting a process.
"""
from __future__ import annotations

import asyncio
import logging
import time

logger = logging.getLogger("common.tenant_hosts")

# Short enough that a freshly-READY domain unblocks on its own, long enough that
# a busy endpoint is not issuing a query per request.
_TTL_SECONDS = 60.0

# host -> apex. Both `broker.com` and `www.broker.com` map to `broker.com`, and
# so do `app.broker.com` / `admin.broker.com` in subdomain mode.
_snapshot: dict[str, str] = {}
_fetched_at: float = 0.0
_refresh_lock = asyncio.Lock()


def hostnames_for(
    domain: str,
    app_subdomain: str | None,
    admin_subdomain: str | None,
) -> list[str]:
    """Every hostname we answer on for one tenant.

    Canonical definition — `branding_service.hostnames_for` delegates here so the
    set the CORS layer allows can never drift from the set the operator script
    is told to serve. A mismatch between those two is invisible until a tenant
    reports that one of their hosts 403s and the other does not.

    Apex mode serves the apex and www; subdomain mode serves only the labelled
    host, leaving the apex to whatever the tenant hosts themselves.
    """
    domain = (domain or "").strip().lower().rstrip(".")
    if not domain:
        return []
    app_label = (app_subdomain or "").strip().lower().strip(".")
    hosts = [f"{app_label}.{domain}"] if app_label else [domain, f"www.{domain}"]
    admin_label = (admin_subdomain or "").strip().lower().strip(".")
    if admin_label:
        admin_host = f"{admin_label}.{domain}"
        if admin_host not in hosts:
            hosts.append(admin_host)
    return hosts


def normalise_host(raw: str | None) -> str:
    """Bare lowercase hostname — no port, no trailing dot, no scheme."""
    h = (raw or "").strip().lower()
    if "://" in h:
        h = h.split("://", 1)[1]
    h = h.split("/")[0].split(":")[0].rstrip(".")
    return h


async def refresh(force: bool = False) -> None:
    """Reload the snapshot if it has aged out. Never raises.

    A failed refresh keeps the previous snapshot rather than emptying it: a
    database blip should not log every tenant out of CORS and downgrade their
    cookies to host-only mid-session.
    """
    global _snapshot, _fetched_at
    if not force and (time.monotonic() - _fetched_at) < _TTL_SECONDS:
        return
    async with _refresh_lock:
        # Another coroutine may have refreshed while we waited for the lock.
        if not force and (time.monotonic() - _fetched_at) < _TTL_SECONDS:
            return
        try:
            from sqlalchemy import select

            from packages.common.src.database import AsyncSessionLocal
            from packages.common.src.models import User

            async with AsyncSessionLocal() as session:
                rows = (
                    await session.execute(
                        select(
                            User.custom_domain,
                            User.app_subdomain,
                            User.admin_subdomain,
                        ).where(
                            User.custom_domain.isnot(None),
                            User.custom_domain_status == "READY",
                        )
                    )
                ).all()
            fresh: dict[str, str] = {}
            for domain, app_sub, admin_sub in rows:
                apex = (domain or "").strip().lower()
                if not apex:
                    continue
                for host in hostnames_for(apex, app_sub, admin_sub):
                    fresh[host] = apex
            _snapshot = fresh
            _fetched_at = time.monotonic()
        except Exception:
            # Keep the stale snapshot; try again on the next tick.
            logger.warning("tenant host refresh failed; keeping previous snapshot",
                           exc_info=True)
            _fetched_at = time.monotonic() - (_TTL_SECONDS / 2)


def invalidate() -> None:
    """Force the next `refresh()` to hit the database.

    Called when a domain flips to READY or is disconnected so the change lands
    within the request that made it rather than up to a minute later.
    """
    global _fetched_at
    _fetched_at = 0.0


def snapshot() -> dict[str, str]:
    return _snapshot


def apex_for_host(host: str | None) -> str | None:
    """The tenant apex owning this hostname, or None if we do not serve it."""
    return _snapshot.get(normalise_host(host)) if host else None


def is_tenant_host(host: str | None) -> bool:
    return apex_for_host(host) is not None
