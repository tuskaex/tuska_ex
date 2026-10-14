#!/usr/bin/env bash
#
# Run the sub-broker suite against a throwaway stack: Postgres (built the way
# production is: init-db.sql, then alembic), Redis, the gateway and the admin
# service, all on a private network under their own names. Nothing touches an
# existing tuskaex stack, volume or database; everything is removed on exit.
#
#   bash backend/tests/subbroker/run.sh            # from the repo root
#   BUILD=0 bash backend/tests/subbroker/run.sh    # reuse already-built images
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows: leave container paths alone

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && { pwd -W 2>/dev/null || pwd; })"
P=tuskaex-subbroker-test
NET=$P-net
GW_IMG=$P-gateway:latest
AD_IMG=$P-admin:latest

cleanup() {
  docker rm -f $P-pg $P-redis $P-gw $P-admin >/dev/null 2>&1 || true
  docker network rm $NET >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

if [ "${BUILD:-1}" = "1" ]; then
  echo "▶ building images"
  docker build -q -f "$ROOT/backend/services/gateway/Dockerfile" -t $GW_IMG "$ROOT" >/dev/null
  docker build -q -f "$ROOT/backend/services/admin/Dockerfile" -t $AD_IMG "$ROOT" >/dev/null
fi

docker network create $NET >/dev/null
echo "▶ starting postgres + redis"
docker run -d --name $P-pg --network $NET --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_USER=tuskaex -e POSTGRES_PASSWORD=test -e POSTGRES_DB=tuskaex \
  -v "$ROOT/backend/infra/docker/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro" \
  postgres:16-alpine >/dev/null
docker run -d --name $P-redis --network $NET redis:7-alpine >/dev/null
for _ in $(seq 60); do
  docker exec $P-pg pg_isready -U tuskaex -d tuskaex -h 127.0.0.1 >/dev/null 2>&1 && break
  sleep 1
done
# initdb restarts the server once after running init scripts; wait for that too.
sleep 3
for _ in $(seq 60); do
  docker exec $P-pg pg_isready -U tuskaex -d tuskaex -h 127.0.0.1 >/dev/null 2>&1 && break
  sleep 1
done

DB="postgresql+asyncpg://tuskaex:test@$P-pg:5432/tuskaex"
ENV=(
  -e DATABASE_URL="$DB" -e TIMESCALE_URL="$DB" -e REDIS_URL="redis://$P-redis:6379/0"
  -e JWT_SECRET=subbroker-test-jwt-secret-0123456789abcdef
  -e USER_JWT_SECRET=subbroker-test-jwt-secret-0123456789abcdef
  -e ADMIN_JWT_SECRET=subbroker-test-admin-secret-0123456789abcd
  -e ENVIRONMENT=test -e BRANDING_ENABLED=true
  -e CORS_ORIGINS=https://tuskaex.com -e INFOWAY_API_KEY= -e SMTP_HOST=
  -e BANNERS_UPLOAD_DIR=/app/uploads/banners -e BRANDING_UPLOAD_DIR=/app/uploads/branding
  -e WALLET_UPLOAD_ROOT=/app/uploads/wallet -e BANK_QR_UPLOAD_DIR=/app/uploads/qr
  -e KYC_UPLOAD_ROOT=/app/uploads/kyc
  -e ADMIN_EMAIL=seed-admin@example.test -e ADMIN_PASSWORD=Seed-Admin-Test-Only-42
)

alembic_run() {
  docker run --rm --network $NET --user root "${ENV[@]}" -v "$ROOT/backend:/src:ro" -w /src $GW_IMG sh -c "
    pip install -q alembic >/dev/null 2>&1 && $1" > /tmp/$P-migrate.log 2>&1     || { echo "✗ migration failed ($1):"; tail -30 /tmp/$P-migrate.log; exit 1; }
}
ALEMBIC="alembic -c infra/migrations/alembic.ini"
pg() { docker exec $P-pg psql -U tuskaex -d tuskaex -tAc "$1"; }
wait_health() {
  for _ in $(seq 90); do
    docker run --rm --network $NET curlimages/curl:8.10.1 -sf "$1/health" >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "✗ $1 never became healthy"; docker logs --tail 40 "$2"; exit 1
}

echo "▶ deploy-before-migrate: schema at 0062, new gateway must add the columns itself"
alembic_run "$ALEMBIC upgrade 0062"
[ "$(pg "SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name IN ('brand_color','client_features','admin_color')")" = "0" ]   || { echo "✗ columns present before the gateway ran"; exit 1; }
docker run -d --name $P-gw --network $NET "${ENV[@]}" $GW_IMG   uvicorn services.gateway.src.main:app --host 0.0.0.0 --port 8000 >/dev/null
wait_health "http://$P-gw:8000" $P-gw
n=$(pg "SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name IN ('brand_color','client_features','admin_color')")
[ "$n" = "3" ] || { echo "✗ gateway startup added $n of 3 tenant columns"; exit 1; }
echo "  ✓ gateway added brand_color, client_features, admin_color on startup"
docker rm -f $P-gw >/dev/null

echo "▶ migrating on top: up to head, down to 0062, up again"
alembic_run "$ALEMBIC upgrade head && $ALEMBIC downgrade 0062 && $ALEMBIC upgrade head"
echo "  ✓ alembic_version = $(pg 'SELECT version_num FROM alembic_version')"

echo "▶ starting gateway + admin"
docker run -d --name $P-gw --network $NET "${ENV[@]}" $GW_IMG \
  uvicorn services.gateway.src.main:app --host 0.0.0.0 --port 8000 >/dev/null
docker run -d --name $P-admin --network $NET "${ENV[@]}" $AD_IMG \
  uvicorn main:app --host 0.0.0.0 --port 8001 >/dev/null

echo "▶ running tests"
set +e
docker run --rm --network $NET --user root "${ENV[@]}" \
  -e GATEWAY_URL="http://$P-gw:8000" -e ADMIN_URL="http://$P-admin:8001" \
  -e PYTHONPATH=/app:/tests -v "$ROOT/backend/tests/subbroker:/tests:ro" -w /tests $GW_IMG sh -c '
  pip install -q pytest >/dev/null 2>&1
  python - <<EOF
import time, httpx, os
for url in (os.environ["GATEWAY_URL"] + "/health", os.environ["ADMIN_URL"] + "/health"):
    for _ in range(90):
        try:
            if httpx.get(url, timeout=2).status_code == 200: break
        except Exception: pass
        time.sleep(1)
    else:
        raise SystemExit("service never became healthy: " + url)
EOF
  python -m pytest -q -p no:cacheprovider -rf "$@"' sh "$@"
rc=$?
set -e
if [ $rc -ne 0 ]; then
  echo "── gateway log (tail) ──"; docker logs --tail 40 $P-gw 2>&1
  echo "── admin log (tail) ──";   docker logs --tail 40 $P-admin 2>&1
fi
exit $rc
