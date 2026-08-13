"""CORS for white-label tenant domains.

`CORSMiddleware` is configured from `CORS_ORIGINS`, an environment variable
written when the platform is deployed. A tenant connects `broker.com` weeks
later, so their origin is not in that list and cannot be without a redeploy per
customer. The browser then blocks every XHR the tenant's site makes and the page
renders as an empty shell with only a CORS error in the console — the backend
logs nothing, because the request was refused before it ever became one.

This middleware answers for those origins by looking them up against the live
READY-domain set instead of a static list.

REGISTRATION ORDER IS LOAD-BEARING. Starlette prepends each `add_middleware`
call, so the LAST one registered is the OUTERMOST. This must be registered after
`CORSMiddleware` (and after `add_middleware_stack`) or the built-in one answers
the preflight first and 400s it before we are ever called.

Scope: only origins we already serve. A hostname that is not in the tenant
snapshot falls straight through to `CORSMiddleware`, which handles the
platform's own origins exactly as it did before this existed.
"""
from __future__ import annotations

import logging

from starlette.requests import Request
from starlette.responses import Response

from packages.common.src import tenant_hosts

logger = logging.getLogger("common.tenant_cors")

_DEFAULT_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
_DEFAULT_HEADERS = "Authorization,Content-Type,X-Requested-With"


def install_tenant_cors(app, *, static_origins: set[str] | None = None) -> None:
    """Attach the tenant CORS middleware to `app`.

    `static_origins` is the platform's own allow-list. Origins in it are skipped
    so `CORSMiddleware` keeps ownership of them — emitting our own headers too
    would produce a duplicated `Access-Control-Allow-Origin`, which browsers
    reject outright.
    """
    allow = {o.strip().rstrip("/").lower() for o in (static_origins or set()) if o.strip()}

    @app.middleware("http")
    async def _tenant_cors(request: Request, call_next):
        origin = (request.headers.get("origin") or "").strip()
        if not origin:
            return await call_next(request)
        if origin.rstrip("/").lower() in allow:
            return await call_next(request)

        # Refreshing here — on the outermost middleware — is what keeps the
        # snapshot warm for everything downstream, including the synchronous
        # cookie-domain lookup that runs while the response is being built.
        try:
            await tenant_hosts.refresh()
        except Exception:
            return await call_next(request)

        host = tenant_hosts.normalise_host(origin)
        if not tenant_hosts.is_tenant_host(host):
            return await call_next(request)

        if request.method == "OPTIONS":
            # Short-circuit the preflight. Letting it continue would reach
            # CORSMiddleware, which does not know this origin and answers 400.
            response: Response = Response(status_code=204)
        else:
            response = await call_next(request)

        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers.setdefault(
            "Access-Control-Allow-Methods",
            request.headers.get("access-control-request-method") or _DEFAULT_METHODS,
        )
        response.headers.setdefault(
            "Access-Control-Allow-Headers",
            request.headers.get("access-control-request-headers") or _DEFAULT_HEADERS,
        )
        response.headers.setdefault("Access-Control-Max-Age", "86400")
        # Caches keyed only on the URL would otherwise serve one tenant's ACAO
        # header to another tenant's browser.
        existing_vary = response.headers.get("Vary")
        if not existing_vary:
            response.headers["Vary"] = "Origin"
        elif "origin" not in existing_vary.lower():
            response.headers["Vary"] = f"{existing_vary}, Origin"
        return response
