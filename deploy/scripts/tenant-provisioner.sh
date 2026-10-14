#!/usr/bin/env bash
#
# Serve every white-label domain automatically. Runs as root every minute
# (systemd timer installed by install-tenant-provisioner.sh).
#
# The platform admin only creates the sub-broker and connects the domain in the
# admin panel; the broker only adds the DNS records. For each connected domain
# this:
#   1. writes the nginx vhost (connect-tenant-domain.sh),
#   2. waits until the hostnames actually reach this server over HTTP,
#   3. issues a Let's Encrypt certificate for the names that do (works direct
#      or behind Cloudflare), falling back to the Cloudflare origin cert,
#   4. binds the certificate and reloads nginx,
#   5. writes progress to users.custom_domain_last_error so the admin panel
#      shows "waiting for DNS" etc.
# Domains no longer connected to an active broker have their vhost removed.
set -uo pipefail

DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CONNECT="$DIR/deploy/scripts/connect-tenant-domain.sh"
STATE_DIR=/var/lib/tuskaex-tenants
WEBROOT=/var/www/certbot
NGINX_ENABLED=/etc/nginx/sites-enabled
env_val() { sed -n "s/^$1=//p" "$DIR/.env" 2>/dev/null | tail -1 | tr -d "\"' "; }
PG_USER="$(env_val POSTGRES_USER)"; PG_DB="$(env_val POSTGRES_DB)"
PG="docker exec ${PG_CONTAINER:-tuskaex-postgres-1} psql -U ${PG_USER:-tuskaex} -d ${PG_DB:-tuskaex} -tA -v ON_ERROR_STOP=1"
RETRY_AFTER_FAIL=1200   # seconds between certificate attempts for one domain

# Cloudflare origin certificate, for names Let's Encrypt has not covered yet.
export CERT="${CERT:-/etc/ssl/cloudflare/origin.pem}" CERT_KEY="${CERT_KEY:-/etc/ssl/cloudflare/origin-key.pem}"

exec 9>/run/tuskaex-tenant-provisioner.lock
flock -n 9 || exit 0
mkdir -p "$STATE_DIR" "$WEBROOT/.well-known/acme-challenge"

log() { echo "[$(date '+%F %T')] $*"; }
sql_quote() { printf "%s" "$1" | sed "s/'/''/g"; }
set_note() {  # domain, message ('' clears)
  local d m; d=$(sql_quote "$1"); m=$(sql_quote "$2")
  if [ -n "$2" ]; then
    $PG -c "UPDATE users SET custom_domain_last_error='$m' WHERE custom_domain='$d'" >/dev/null 2>&1
  else
    $PG -c "UPDATE users SET custom_domain_last_error=NULL, custom_domain_provisioned_at=COALESCE(custom_domain_provisioned_at, now()) WHERE custom_domain='$d'" >/dev/null 2>&1
  fi
}

# Does http://<host>/.well-known/acme-challenge/<token> come back from us?
reaches_us() {
  local host="$1" token
  token="tx-probe-$(date +%s%N)"
  echo "$token" > "$WEBROOT/.well-known/acme-challenge/$token"
  local got
  got=$(curl -s -m 8 "http://$host/.well-known/acme-challenge/$token" 2>/dev/null || true)
  rm -f "$WEBROOT/.well-known/acme-challenge/$token"
  [ "$got" = "$token" ]
}

ROWS=$($PG -c "SELECT custom_domain, coalesce(app_subdomain,''), coalesce(admin_subdomain,'')
               FROM users
               WHERE custom_domain IS NOT NULL AND status='active'
                 AND role IN ('sub_admin','super_admin')" 2>/dev/null) || { log "database unreachable"; exit 0; }

WANTED=""
while IFS='|' read -r DOMAIN APP ADMIN; do
  [ -n "$DOMAIN" ] || continue
  echo "$DOMAIN" | grep -qE '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' || continue
  WANTED="$WANTED $DOMAIN"

  ARGS=("$DOMAIN")
  [ -n "$APP" ] && ARGS+=(--app "$APP")
  [ -n "$ADMIN" ] && ARGS+=(--admin "$ADMIN")
  if [ -n "$APP" ]; then NAMES=("$APP.$DOMAIN"); else NAMES=("$DOMAIN" "www.$DOMAIN"); fi
  [ -n "$ADMIN" ] && NAMES+=("$ADMIN.$DOMAIN")

  SIG="${APP}|${ADMIN}"
  STATE="$STATE_DIR/$DOMAIN"
  OLD_SIG=$(sed -n 's/^sig=//p' "$STATE" 2>/dev/null)
  CERT_NAMES=$(sed -n 's/^certnames=//p' "$STATE" 2>/dev/null)
  LAST_FAIL=$(sed -n 's/^lastfail=//p' "$STATE" 2>/dev/null)

  # 1. vhost (re)written when missing or when the subdomain layout changed.
  if [ ! -e "$NGINX_ENABLED/tenant-$DOMAIN.conf" ] || [ "$SIG" != "$OLD_SIG" ]; then
    log "$DOMAIN: writing vhost"
    bash "$CONNECT" "${ARGS[@]}" >/dev/null 2>&1 || log "$DOMAIN: vhost write failed"
    CERT_NAMES=""
  fi

  # 2. Which names reach this server right now.
  LIVE=()
  for n in "${NAMES[@]}"; do reaches_us "$n" && LIVE+=("$n"); done
  if [ "${#LIVE[@]}" -eq 0 ]; then
    # Behind Cloudflare with "Always Use HTTPS", plain HTTP never reaches us
    # but the site already works on the origin certificate (Cloudflare Full).
    token="tx-probe-$(date +%s%N)"
    echo "$token" > "$WEBROOT/.well-known/acme-challenge/$token"
    got=$(curl -sk -m 8 "https://${NAMES[0]}/.well-known/acme-challenge/$token" 2>/dev/null || true)
    rm -f "$WEBROOT/.well-known/acme-challenge/$token"
    if [ "$got" = "$token" ]; then
      set_note "$DOMAIN" ""
      printf 'sig=%s\ncertnames=%s\nlastfail=%s\n' "$SIG" "$CERT_NAMES" "$LAST_FAIL" > "$STATE"
      continue
    fi
    IP=$(sed -n 's/^PLATFORM_PUBLIC_IP=//p' "$DIR/.env" 2>/dev/null | tr -d "\"' ")
    [ -n "$IP" ] || IP="the platform IP"
    set_note "$DOMAIN" "Waiting for DNS: add A records for ${NAMES[*]} pointing to $IP."
    printf 'sig=%s\ncertnames=%s\nlastfail=%s\n' "$SIG" "$CERT_NAMES" "$LAST_FAIL" > "$STATE"
    continue
  fi

  # 3. Certificate for the reachable names, unless it already covers them.
  WANT_NAMES=$(printf '%s\n' "${LIVE[@]}" | sort | tr '\n' ' ')
  if [ "$WANT_NAMES" != "$CERT_NAMES" ]; then
    NOW=$(date +%s)
    if [ -n "$LAST_FAIL" ] && [ $((NOW - LAST_FAIL)) -lt $RETRY_AFTER_FAIL ]; then
      printf 'sig=%s\ncertnames=%s\nlastfail=%s\n' "$SIG" "$CERT_NAMES" "$LAST_FAIL" > "$STATE"
      continue
    fi
    command -v certbot >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq certbot; } >/dev/null 2>&1
    D_ARGS=(); for n in "${LIVE[@]}"; do D_ARGS+=(-d "$n"); done
    log "$DOMAIN: requesting certificate for ${LIVE[*]}"
    if certbot certonly --webroot -w "$WEBROOT" --cert-name "$DOMAIN" "${D_ARGS[@]}" \
         --non-interactive --agree-tos --register-unsafely-without-email \
         --keep-until-expiring --expand \
         --deploy-hook "systemctl reload nginx" >/dev/null 2>&1; then
      CERT_NAMES="$WANT_NAMES"; LAST_FAIL=""
      # 4. Rewrite the vhost: connect-tenant-domain.sh binds the LE cert when present.
      bash "$CONNECT" "${ARGS[@]}" >/dev/null 2>&1
      log "$DOMAIN: live with certificate"
    else
      LAST_FAIL=$NOW
      log "$DOMAIN: certificate request failed; serving with origin certificate (needs Cloudflare)"
      set_note "$DOMAIN" "DNS reaches the server, but the SSL certificate could not be issued yet. Retrying automatically."
      printf 'sig=%s\ncertnames=%s\nlastfail=%s\n' "$SIG" "$CERT_NAMES" "$LAST_FAIL" > "$STATE"
      continue
    fi
  fi

  MISSING=()
  for n in "${NAMES[@]}"; do printf '%s\n' "${LIVE[@]}" | grep -qx "$n" || MISSING+=("$n"); done
  if [ "${#MISSING[@]}" -gt 0 ]; then
    set_note "$DOMAIN" "Live. Not yet reachable: ${MISSING[*]} — add their A records too."
  else
    set_note "$DOMAIN" ""
  fi
  printf 'sig=%s\ncertnames=%s\nlastfail=%s\n' "$SIG" "$CERT_NAMES" "$LAST_FAIL" > "$STATE"
done <<< "$ROWS"

# 5. Domains no longer connected to an active broker stop being served.
for f in "$NGINX_ENABLED"/tenant-*.conf; do
  [ -e "$f" ] || continue
  d=$(basename "$f" .conf); d=${d#tenant-}
  # Only per-domain vhosts. deploy/nginx/tenant-catchall.conf shares the prefix
  # and serves every tenant; removing it would take them all offline.
  case "$d" in *.*) ;; *) continue ;; esac
  case " $WANTED " in *" $d "*) ;; *)
    log "$d: no active broker owns it any more — removing vhost"
    bash "$CONNECT" "$d" --remove >/dev/null 2>&1
    rm -f "$STATE_DIR/$d"
  ;; esac
done
exit 0
