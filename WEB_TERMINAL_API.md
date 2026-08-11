# TuskaEx — Web Terminal API & WebSocket Reference

Everything a web trading terminal needs: REST endpoints, live WebSocket
streams, auth, and payload shapes.

Extracted from the running code (`backend/services/gateway/src/`), not
written from memory — 151 REST routes and 5 WebSocket endpoints.

---

## 1. Hosts

| Host | Serves |
|------|--------|
| `https://api.tuskaex.com` | Gateway — REST **and** all WebSockets |
| `https://speedtrade.tech/trading/terminal` | **The trading terminal.** Same Next.js app as the CRM, reached on this host; own `/ws/` upgrade block |
| `https://speedtrade.tech/` | SpeedTrade marketing site — a *different* Next app (`speedtrade_landing/`) on the same hostname, split by path in nginx |
| `https://tuskaex.com` | CRM: dashboard, wallet, KYC, deposits, IB, support, auth |
| `https://trade.tuskaex.com` | Same app on a subdomain; kept working, no longer where the terminal lives |

> **The terminal is on a different registrable domain from the CRM.**
> That is the single fact that explains most of what follows. A cookie
> scoped to `.tuskaex.com` is never sent to `speedtrade.tech` — the
> browser will not do it, and CORS has no say in the matter. So a user
> clicking "Trade" cannot simply be redirected; the session has to be
> handed across explicitly. See §2C.

> **WebSockets: connect to `api.tuskaex.com`, except from the terminal.**
> `trade.tuskaex.com` proxies REST fine but does not upgrade WebSocket
> connections — only `api.` has that block in `deploy/nginx/tuskaex.conf`.
> `speedtrade.tech` is the exception: it has its own `/ws/` block
> (`deploy/nginx/speedtrade.conf`) proxying to the same
> gateway, and the terminal **must** use it. Its cookie lives on
> `.speedtrade.tech`, so dialling `api.tuskaex.com` sends no credentials
> and `/ws/trades` closes `4003`. `getWebSocketBaseUrl()` handles this.

**Base URL:** `https://api.tuskaex.com/api/v1`

---

## 2. Authentication

Two completely separate schemes. Pick one — do not mix them.

### A. Session JWT — for a browser terminal

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "..." }
```

Returns an access token **and** sets `HttpOnly` cookies (`pt_access`,
plus a refresh cookie). Cookie domain is `.tuskaex.com`, so a terminal
on any `*.tuskaex.com` subdomain gets them automatically.

Send it as either:
- `Authorization: Bearer <token>`, or
- the `pt_access` cookie (automatic in-browser, and what the
  WebSockets prefer)

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | email + password |
| `POST /auth/demo-login` | instant demo account, no signup |
| `POST /auth/google` | Google OAuth |
| `POST /auth/wallet/nonce` → `/auth/wallet/verify` | wallet sign-in |
| `POST /auth/refresh` | rotate the access token |
| `GET /auth/me` | current user |
| `POST /auth/logout` | clear session |
| `GET /auth/platform-status` | maintenance flag — poll before trading |

Access token expiry is `JWT_ACCESS_EXPIRY_MINUTES` (45 by default), so
refresh before it lapses or requests start 401ing mid-session.

### C. Handoff code — CRM → terminal, across domains

Only needed because the two sites are on different registrable domains.
The CRM holds a `.tuskaex.com` session; the terminal needs one on
`.speedtrade.tech`. A code is what crosses.

```http
POST /api/v1/auth/handoff          ← CRM, JWT-authed
→ { "code": "<43 chars>", "expires_in": 60, "terminal_url": "https://speedtrade.tech" }

POST /api/v1/auth/handoff/redeem   ← terminal, NO auth
{ "code": "..." }
→ sets pt_access + pt_refresh, Domain=.speedtrade.tech
```

The code is **single-use** (redeemed with Redis `GETDEL`, so a replay
finds nothing) and expires in `HANDOFF_TTL_SECONDS`. Only the code rides
the URL — never the JWT — so nothing recoverable is left in browser
history, a `Referer` header, or an access log. The terminal strips
`?handoff=` from the address bar as soon as it has redeemed it.

Account status and role are re-checked at redeem, not just at mint: a
user banned inside that 60-second window does not get a session.

Client side this is all in
[`frontend/trader/src/lib/terminalHandoff.ts`](frontend/trader/src/lib/terminalHandoff.ts);
`/terminal` is the staging route that mints and redirects.

**Two settings this depends on, both easy to miss:**

| Setting | Must contain | Symptom when missing |
|---|---|---|
| `CORS_ORIGINS` | `https://speedtrade.tech` | Redeem POST 403s; every WebSocket closes `4003` |
| `COOKIE_DOMAINS` | `.speedtrade.tech` | Redeem "succeeds" and sets a cookie for a domain the terminal can never send back — user lands on the login screen with no error anywhere |

### B. API key + secret — for bots, EAs, external terminals

Namespace: `/api/algo` (**no** `/v1`). Bots never send a JWT.

```http
X-Api-Key:    <key>
X-Api-Secret: <secret>
```

Generate at `POST /api/v1/algo/generate` (JWT-authed). Full guide in
[`ALGO_API.md`](ALGO_API.md).

---

## 3. Market data

| Method | Path | Notes |
|---|---|---|
| `GET` | `/instruments/` | All tradable instruments |
| `GET` | `/instruments/{symbol}` | One instrument (digits, contract size, limits) |
| `GET` | `/instruments/prices/all` | **Snapshot of every live quote** — use once on load |
| `GET` | `/instruments/{symbol}/price` | Single quote |
| `GET` | `/instruments/{symbol}/bars` | OHLC history — see below |
| `GET` | `/instruments/market-status` | Open/closed per instrument |
| `GET` | `/instruments/market-status/{symbol}` | One instrument's session state |

**Bars** — TradingView-compatible:

```
GET /instruments/XAUUSD/bars?resolution=1D&from=<epoch_s>&to=<epoch_s>
```

`resolution`: `1`, `5`, `15`, `30`, `60`, `240`, `1D`
Returns `{ "bars": [{ time, open, high, low, close, volume }] }`

> 59 instruments exist, but only those the feed is actively quoting
> return prices. Check `/instruments/prices/all` before hard-coding a
> symbol list — a non-quoting symbol returns nothing, not an error.

---

## 4. Trading

### Orders

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/orders/` | Place market / limit / stop |
| `GET` | `/orders/?account_id=&status=pending` | List orders |
| `PUT` | `/orders/{order_id}` | Modify price / lots / SL / TP |
| `DELETE` | `/orders/{order_id}` | Cancel a **pending** order |

`DELETE` returns `400 "Can only cancel pending orders"` if the order
already filled or was cancelled. **Refetch the list after every cancel** —
a stale UI double-cancelling is exactly what produced that error in
production.

### Positions

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/positions/?account_id=&status=open` | Open or closed positions |
| `PUT` | `/positions/{position_id}` | Update SL / TP |
| `POST` | `/positions/{position_id}/close` | Close fully, or partially with `{ "lots": n }` |
| `GET` | `/positions/sentiment` | Long/short ratio per instrument |

### Accounts

| Method | Path |
|---|---|
| `GET` | `/accounts` · `/accounts/{id}` · `/accounts/{id}/summary` |
| `POST` | `/accounts/open` |
| `PATCH` | `/accounts/{id}/leverage` |
| `GET` | `/accounts/available-groups` |

`/accounts/{id}/summary` is the header row: balance, equity, margin,
free margin, margin level.

### Portfolio & history

`GET /portfolio/summary` · `/portfolio/performance` · `/portfolio/trades` · `/portfolio/export`

---

## 5. WebSockets

All on `wss://api.tuskaex.com`.

| Endpoint | Auth | Carries |
|---|---|---|
| `/ws/prices` | optional JWT | Every tick, all symbols |
| `/ws/bars` | optional JWT | Live OHLC bar updates |
| `/ws/trades/{account_id}` | **JWT required** | Fills, closes, stop-outs, balance |
| `/ws/algo/prices` | key + secret | Ticks for bots |
| `/ws/admin` | admin JWT | Back-office feed |

**Origin is enforced.** Handshakes are rejected with close code `4003`
unless the `Origin` header is in `CORS_ORIGINS`. Add your terminal's
origin there or the socket closes immediately. Requests with no `Origin`
(non-browser clients) pass through and are checked on the token instead.

All sockets send `{"type":"ping"}` every 30s. Reply with
`{"type":"pong"}` on `/ws/trades`; the others ignore it.

### `/ws/prices` — tick stream

Cookie `pt_access` is used automatically in a browser; `?token=` also
works for non-browser clients. Unauthenticated connections are allowed
(prices are public), but an *invalid* token closes with `4001`.

```json
{
  "symbol": "XAUUSD",
  "bid": 4056.12,
  "ask": 4056.42,
  "spread": 0.30,
  "spread_mult": 1.0,
  "timestamp": "2026-07-31T10:22:41Z",
  "ts_ms": 1785492161000,
  "stale": false
}
```

> **Honour `stale`.** A stale tick is a frozen quote the feed stopped
> refreshing. Every enforcement path in the backend drops it — your
> terminal must too, or it will show a confident wrong price.
> Use `ts_ms` for a format-independent freshness check.

### `/ws/bars` — live candles

Subscribe per symbol/resolution after connecting:

```json
→ { "type": "subscribe",   "symbol": "XAUUSD", "resolution": "5" }
→ { "type": "unsubscribe", "symbol": "XAUUSD", "resolution": "5" }
```

```json
← { "symbol":"XAUUSD", "timeframe":"5m", "time":1785492000,
    "open":4055.1, "high":4057.0, "low":4054.8, "close":4056.4,
    "volume":128, "tick_count":128, "closed":false }
```

Same `time` redrawn = the live candle extending.
New `time` = the previous candle closed.
`closed: true` marks the final print for that bar.

Resolution → timeframe mapping: `1`→`1m`, `5`→`5m`, `15`→`15m`,
`30`→`30m`, `60`→`1h`, `240`→`4h`, `1D`→`1d`.

### `/ws/trades/{account_id}` — account events

Requires a valid JWT **and** the account must belong to that user, or it
closes with `4003`. This is what keeps a terminal in sync without
polling.

| `type` | Fires when |
|---|---|
| `position_opened` | Position created (incl. copy-trade follower) |
| `position_updated` | SL/TP changed, possibly from another device |
| `position_closed` | Closed — carries `reason` (`sl`, `tp`, `manual`), `profit` |
| `order_filled` | Pending order triggered by the b-book engine |
| `order_update` | Order state changed |
| `stop_out` | Risk engine force-closed at 50% margin |
| `margin_call` | Margin level hit 80% |
| `deposit` / `withdrawal` | Balance changed with no position event |

> `order_filled` means the order became a position — remove it from your
> pending list **and** refetch positions. `stop_out` uses its own type,
> not `position_closed`; handle both or stopped-out positions linger.

---

## 6. Other surfaces

| Area | Base |
|---|---|
| Wallet / deposits / withdrawals | `/wallet/*` (24 routes) |
| Copy trading & PAMM | `/social/*` (23 routes) |
| IB / partner programme | `/business/*` |
| Support tickets | `/support/*` |
| Notifications | `/notifications/*` |
| Profile / KYC / sessions | `/profile/*` |
| Trade share cards | `/positions/{id}/share`, `/public/share/{code}` |

---

## 7. Building a terminal — the order that works

1. `POST /auth/login` → token + cookies
2. `GET /accounts` → pick an account
3. `GET /instruments/` → symbol list, digits, contract sizes
4. `GET /instruments/prices/all` → seed every quote at once
5. Open `wss://api.tuskaex.com/ws/prices` → live ticks
6. `GET /instruments/{sym}/bars` → chart history, then `/ws/bars` to keep it live
7. `GET /positions/?status=open` and `GET /orders/?status=pending`
8. Open `wss://api.tuskaex.com/ws/trades/{account_id}` → react to fills and closes
9. Poll `GET /accounts/{id}/summary` for equity/margin (or refresh on trade events)

### Things that will bite you

- **Add your origin to `CORS_ORIGINS`** or every WebSocket closes `4003`
  and REST preflights fail.
- **Refetch orders after any order action.** Positions and orders are
  separate endpoints; refreshing one does not refresh the other.
- **Drop stale ticks** (`stale: true`).
- **Refresh the JWT** before 45 minutes.
- **Check `GET /auth/platform-status`** — trading endpoints reject while
  maintenance mode is on.
- **Rate limits** are per-endpoint (`RATE_LIMIT_TRADING=120/minute`).
  Bursting bar requests for many symbols at once will trip nginx's
  request-limit zone and return 503.

---

## 8. Interactive docs

FastAPI's OpenAPI UI is **disabled in production** on purpose — it would
publish every endpoint and schema publicly. To browse it, run the stack
locally with `ENVIRONMENT=development` and open:

```
http://localhost:8000/docs        # Swagger
http://localhost:8000/openapi.json
```
