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
