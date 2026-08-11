# TuskaEx

A premium multi-page Forex brokerage website by TuskaEx, built with React, Vite, Tailwind CSS, and Framer Motion.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack

- React 18 + Vite 5
- Tailwind CSS 3
- React Router DOM 6
- Framer Motion (scroll-linked hero animation)
- Lucide React (icons)
- Inter (Google Fonts)

## Domain split: CRM on tuskaex.com, terminal on speedtrade.tech

`tuskaex.com` keeps the CRM — dashboard, wallet, KYC, deposits, IB,
support, auth. The **trading terminal** is served from
`speedtrade.tech`. Both are the same Next app in the same
container; only the hostname differs, and the app branches on it at
runtime.

**Two apps on one hostname.** `speedtrade.tech/` is the SpeedTrade
marketing site (`speedtrade_landing/`, a separate Next app); the terminal
lives under `/trading/`. nginx splits them by path.

That split has one genuine conflict: both apps serve their bundles from
`/_next/static/`, and a shared prefix can only proxy to one of them — the
other boots with no CSS or JS. The textbook fix is an `assetPrefix` on one
app. We do it in nginx instead: try the landing, fall back to the trader
on 404. Next content-hashes every chunk filename, so a name that exists in
one build never exists in the other and the fallback cannot serve the
wrong file.

The reason is deployment, not elegance. `/opt/speedtrade` is **not** a git
checkout — it was copied there by hand. An `assetPrefix` in its
`next.config.ts` would be silently lost the next time anyone re-copies
that tree, and the symptom would be a terminal that renders unstyled with
nothing in any log. Keeping the whole fix in a file `deploy.sh` owns means
a landing redeploy cannot break the terminal.

**Why the session needs a handoff.** `tuskaex.com` and `speedtrade.tech`
are different *registrable* domains, so a `.tuskaex.com` cookie is never
sent to the terminal. Redirecting a user there lands them logged out. So
the CRM mints a single-use code (`POST /auth/handoff`), the code — never
the JWT — travels in the redirect URL, and the terminal exchanges it
(`POST /auth/handoff/redeem`) for cookies on its own domain. Full
description in [`WEB_TERMINAL_API.md`](WEB_TERMINAL_API.md) §2C.

Three settings make it work, and each fails differently:

| Setting | Value | If wrong |
|---|---|---|
| `NEXT_PUBLIC_TERMINAL_ORIGIN` | `https://speedtrade.tech` | Terminal stays in-app on tuskaex.com. **Baked at build time** — rebuild `trader-frontend`, a restart does nothing |
| `COOKIE_DOMAINS` | `.tuskaex.com,.speedtrade.tech` | Redeem sets a cookie the terminal cannot send back; user silently bounces to login |
| `CORS_ORIGINS` | must include `https://speedtrade.tech` | Redeem 403s and every WebSocket closes `4003` |

**Rollback** is blanking `NEXT_PUBLIC_TERMINAL_ORIGIN` + `TERMINAL_APP_URL`
and rebuilding: `tradingTerminalUrl()` goes back to returning
`/trading/terminal` and the old apex → `trade.tuskaex.com` middleware
bounce takes over again. Nothing else has to be reverted.

The vhost is [`deploy/nginx/speedtrade.conf`](deploy/nginx/speedtrade.conf)
— in **this** repo, not next to the landing site's own config, because
`speedtrade_landing/` is gitignored here: a server block placed there can
never reach the server through `deploy.sh`, and the old `if [ -f ]` guard
skipped it without a word, which looks exactly like a successful deploy.

It includes a `/ws/` upgrade block. This host needs one and
`trade.tuskaex.com` does not, for the same cookie-domain reason: the
terminal's session cookie is scoped to `.speedtrade.tech`, so dialling
`wss://api.tuskaex.com` sends no credentials and `/ws/trades` closes
`4003` — the socket looks connected right up until it isn't.

## Event bus

There is no message broker in the deployment. Events that need to fan
out to multiple subscribers (real-time price ticks, position updates,
notifications) use **Redis pub/sub** — Redis is already in the stack.
Durable history (trade fills, audit log, deposits/withdrawals, webhook
events) is the source of truth and lives in **Postgres** as ordinary
tables.

The codebase used to ship Kafka + Zookeeper for an event log that no
consumer ever read. With zero users and zero consumers it was eating
~1.5 GB of RAM for nothing, so it was removed. The
`packages/common/src/kafka_client.produce_event` function is now a
no-op shim so existing call-sites still compile. When a real consumer
is needed (fraud engine, analytics pipeline, audit replayer), the
cheapest re-introduction is **Redis Streams** — `XADD trades * key val`
in place of the no-op. Real Kafka only earns its keep at multi-region,
multi-consumer scale.


## Charting library (licensed — not in git)

The trader terminal renders with **TradingView Advanced Charts (CL v31.0.0)**,
a licensed bundle that lives at `frontend/trader/public/charting_library/`
(~26 MB, 1931 files) and is **deliberately gitignored** — this repo is public,
and the license does not permit redistributing the bundle.

Consequence: `git push` / `git pull` can never move it. Every machine that
builds the trader frontend needs its own copy, placed once. Ship it as a
tarball — `scp -r` of ~1930 tiny files takes minutes and is easy to interrupt
half-way, which leaves a partial tree that looks installed but 404s:

```bash
# on a machine that has the library
tar -czf cl.tar.gz -C frontend/trader/public charting_library   # ~5 MB
scp cl.tar.gz <server>:/tmp/

# on the server
rm -rf /opt/tuskaex/frontend/trader/public/charting_library
tar -xzf /tmp/cl.tar.gz -C /opt/tuskaex/frontend/trader/public/
rm /tmp/cl.tar.gz
```

It then survives every future deploy — git does not touch ignored paths, and
the Dockerfile copies `public/` verbatim into the image. `deploy.sh` refuses to
build the trader frontend when the bundle is absent, because a missing bundle
produces a build that boots fine and only fails at runtime with "Chart library
not found" ([TradingViewChart.tsx](frontend/trader/src/components/charts/TradingViewChart.tsx)).

Sanity check on a server:

```bash
curl -sI https://trade.tuskaex.com/charting_library/charting_library.standalone.js | head -1
# want: HTTP/2 200   (404 → bundle not on the server; 503 → nginx rate limit)
```

## Backups & disaster recovery

Daily snapshots of Postgres, TimescaleDB, and the `uploads/` directory are
written to `/opt/tuskaex/backups/` and (optionally) mirrored to an offsite
`rclone` remote (Backblaze B2 / Cloudflare R2 / S3 / DO Spaces).

**One-time setup on a server:**
```bash
chmod +x scripts/*.sh
rclone config                                # configure your offsite remote once
./scripts/install-backup-cron.sh             # installs daily 03:00 UTC cron
```

**Manual on-demand snapshot:**
```bash
set -a && source .env && set +a
./scripts/backup.sh
```

**Restore from a known-good dump:**
```bash
./scripts/restore.sh \
  backups/postgres-2026-05-02_0300.sql.gz \
  backups/uploads-2026-05-02_0300.tar.gz
```

**Full disaster-recovery runbook (rebuild on a fresh VPS in ~30 min):** see
[`docs/disaster-recovery.md`](docs/disaster-recovery.md). Practice it once
a quarter on a throwaway VPS — untested backups are no backups.

Configure retention + offsite via the `BACKUP_*` vars in `.env` (see
`.env.example`). The `.env` itself is **not** part of the backup blob —
keep an encrypted copy in a password manager.
