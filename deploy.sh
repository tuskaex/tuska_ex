#!/usr/bin/env bash
#
# One-command deploy: pull, figure out what actually changed, run migrations
# if needed, rebuild + restart only the affected services, reload nginx if
# its config changed, then healthcheck. Bails out cleanly when nothing
# changed so repeated runs are cheap.
#
# Usage (on the server):
#   ./deploy.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tuskaex}"
COMPOSE="docker compose -f $REPO_DIR/docker-compose.yml -f $REPO_DIR/docker-compose.prod.yml"

cd "$REPO_DIR"

BEFORE=$(git rev-parse HEAD)
git pull --ff-only origin main
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  echo "Already up to date ($AFTER). Nothing to do."
  exit 0
fi

CHANGED=$(git diff --name-only "$BEFORE" "$AFTER")
echo "── Changed files ────────────────────────────────"
echo "$CHANGED"
echo "─────────────────────────────────────────────────"

matches() { echo "$CHANGED" | grep -E "$1" >/dev/null 2>&1; }

# `packages/common` is shared by every backend service, so changes there
# fan out to all of them. Frontends are independent.
NEEDS_COMMON=0;       matches '^backend/packages/common/'         && NEEDS_COMMON=1
NEEDS_GATEWAY=0;      matches '^backend/services/gateway/'        && NEEDS_GATEWAY=1
NEEDS_ADMIN_API=0;    matches '^backend/services/admin/'          && NEEDS_ADMIN_API=1
NEEDS_BBOOK=0;        matches '^backend/services/b-book-engine/'  && NEEDS_BBOOK=1
NEEDS_MD=0;           matches '^backend/services/market-data/'    && NEEDS_MD=1
NEEDS_RISK=0;         matches '^backend/services/risk-engine/'    && NEEDS_RISK=1
NEEDS_TRADER=0;       matches '^frontend/trader/'                 && NEEDS_TRADER=1
NEEDS_ADMIN_FE=0;     matches '^frontend/admin/'                  && NEEDS_ADMIN_FE=1
NEEDS_MIGRATE=0;      matches '^backend/infra/migrations/'        && NEEDS_MIGRATE=1
NEEDS_NGINX=0;        matches '^deploy/nginx/'                    && NEEDS_NGINX=1

if [ $NEEDS_COMMON -eq 1 ]; then
  NEEDS_GATEWAY=1; NEEDS_ADMIN_API=1; NEEDS_BBOOK=1; NEEDS_MD=1; NEEDS_RISK=1
fi

if [ $NEEDS_MIGRATE -eq 1 ]; then
  echo "▶ Running migrations…"
  docker compose --profile migrate run --rm migrate
fi

TO_BUILD=()
[ $NEEDS_GATEWAY -eq 1 ]   && TO_BUILD+=(gateway)
[ $NEEDS_ADMIN_API -eq 1 ] && TO_BUILD+=(admin-api)
[ $NEEDS_BBOOK -eq 1 ]     && TO_BUILD+=(b-book-engine)
[ $NEEDS_MD -eq 1 ]        && TO_BUILD+=(market-data)
[ $NEEDS_RISK -eq 1 ]      && TO_BUILD+=(risk-engine)
[ $NEEDS_TRADER -eq 1 ]    && TO_BUILD+=(trader-frontend)
[ $NEEDS_ADMIN_FE -eq 1 ]  && TO_BUILD+=(admin-frontend)

# The TradingView Charting Library is licensed and deliberately untracked
# (frontend/trader/.gitignore) — `git pull` above can never deliver it. The
# Dockerfile copies public/ verbatim, so a missing bundle still builds and
# still boots; the only symptom is "Chart library not found" in the terminal
# at runtime. Fail here instead: a loud deploy-time stop costs a minute, a
# silently chartless production deploy costs an afternoon of bisecting.
#
# The entry file and bundles/ are checked separately because a half-finished
# copy is a real failure mode already hit in production: this server once held
# bundles/ with 130 of ~1930 files and no entry bundle at all, which serves a
# 404 for the entry script and looks identical to "never copied". The file
# floor is a truncation tripwire, not a version assertion.
if [ $NEEDS_TRADER -eq 1 ]; then
  CL=frontend/trader/public/charting_library
  CL_ENTRY=$([ -f "$CL/charting_library.standalone.js" ] && echo yes || echo NO)
  CL_FILES=$(find "$CL" -type f 2>/dev/null | wc -l)
  if [ "$CL_ENTRY" = NO ] || [ "$CL_FILES" -lt 1000 ]; then
    echo "✖ Licensed charting library missing or incomplete — refusing to build a chartless trader."
    echo "    expected: $REPO_DIR/$CL/ — entry bundle + ~1930 files"
    echo "    found:    entry=$CL_ENTRY files=$CL_FILES"
    echo "  It is untracked on purpose. Copy it from a machine that has it —"
    echo "  tar, not 'scp -r': ~1930 tiny files over scp takes minutes, the"
    echo "  tarball is 5 MB and lands in seconds."
    echo "    tar -czf cl.tar.gz -C frontend/trader/public charting_library"
    echo "    scp cl.tar.gz <this-server>:/tmp/"
    echo "  then on the server:"
    echo "    rm -rf $REPO_DIR/$CL"
    echo "    tar -xzf /tmp/cl.tar.gz -C $REPO_DIR/frontend/trader/public/"
    echo "  It survives future deploys — git never touches an ignored directory."
    exit 1
  fi
fi

if [ ${#TO_BUILD[@]} -gt 0 ]; then
  echo "▶ Building: ${TO_BUILD[*]}"
  $COMPOSE build "${TO_BUILD[@]}"
  echo "▶ Restarting: ${TO_BUILD[*]}"
  $COMPOSE up -d "${TO_BUILD[@]}"
else
  echo "▶ No service rebuild needed."
fi

if [ $NEEDS_NGINX -eq 1 ]; then
  echo "▶ Reloading nginx…"
  sudo cp deploy/nginx/tuskaex.conf /etc/nginx/sites-available/tuskaex.conf
  # cloudflare-real-ip.conf is dropped into conf.d once at install time;
  # we re-copy it on each deploy so edits to the file flow through.
  if [ -f deploy/nginx/cloudflare-real-ip.conf ]; then
    sudo cp deploy/nginx/cloudflare-real-ip.conf /etc/nginx/conf.d/cloudflare-real-ip.conf
  fi
  # speedtrade.tech — the landing site AND the trading terminal share this
  # hostname, so this vhost routes TuskaEx traffic and belongs to this repo.
  # It used to live in speedtrade_landing/deploy/nginx/, which is gitignored
  # here: nothing there could ever reach the server through a deploy, and the
  # old `if [ -f ]` guard skipped it without a word. Unconditional now.
  sudo cp deploy/nginx/speedtrade.conf /etc/nginx/sites-available/speedtrade.conf
  sudo ln -sf /etc/nginx/sites-available/speedtrade.conf /etc/nginx/sites-enabled/speedtrade.conf
  # An earlier iteration put the terminal on trade.speedtrade.tech. That
  # hostname was never given a DNS record and the apex is used instead, so drop
  # a stale vhost rather than leave one nobody can reach.
  sudo rm -f /etc/nginx/sites-enabled/terminal.conf /etc/nginx/sites-available/terminal.conf
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "▶ Healthcheck…"
sleep 4
CODE_API=$(curl -sk -o /dev/null -w "%{http_code}" https://api.tuskaex.com/health   || echo "000")
CODE_TRD=$(curl -sk -o /dev/null -w "%{http_code}" https://trade.tuskaex.com/       || echo "000")
echo "  api.tuskaex.com/health  → HTTP $CODE_API"
echo "  trade.tuskaex.com       → HTTP $CODE_TRD"

# 5xx or a flat 000 (no connection) is a real failure. 4xx still means the
# stack is up — caller can decide whether the route should exist.
fail=0
case "$CODE_API" in 000|5*) fail=1 ;; esac
case "$CODE_TRD" in 000|5*) fail=1 ;; esac

# The terminal host, but only once it is actually load-bearing.
#
# Checking it unconditionally fails the deploy during the rollout itself: the
# switch ships blank on purpose, and the DNS record may not exist yet, so the
# host is *expected* to be unreachable right up until it is turned on. A red
# deploy at that point blocks the very rollout that makes it green.
#
# Once NEXT_PUBLIC_TERMINAL_ORIGIN is set, users are being sent there and an
# unreachable host is a genuine outage — a missing server block falls through
# to nginx's default server, which answers with a redirect to tuskaex.com.
TERMINAL_ORIGIN=$(sed -n 's/^NEXT_PUBLIC_TERMINAL_ORIGIN=//p' .env 2>/dev/null | tr -d '"'\''' | tr -d '[:space:]')
if [ -n "${TERMINAL_ORIGIN:-}" ]; then
  CODE_TERM=$(curl -sk -o /dev/null -w "%{http_code}" "${TERMINAL_ORIGIN}/" || echo "000")
  echo "  ${TERMINAL_ORIGIN#https://}   → HTTP $CODE_TERM"
  case "$CODE_TERM" in 000|5*) fail=1 ;; esac
else
  echo "  terminal split          → off (NEXT_PUBLIC_TERMINAL_ORIGIN empty)"
fi

if [ $fail -ne 0 ]; then
  echo "⚠️  Healthcheck failed. Inspect with:"
  echo "    $COMPOSE logs --tail=120 gateway trader-frontend"
  exit 1
fi

echo "✅ Deploy complete: ${BEFORE:0:7} → ${AFTER:0:7}"
