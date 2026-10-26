FROM python:3.12-slim

WORKDIR /app

COPY backend/services/lp-bridge/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/packages/common /app/packages/common
RUN pip install -e /app/packages/common

COPY backend/services/lp-bridge /app/services/lp_bridge

ENV PYTHONPATH=/app

# H8 — drop root.
RUN groupadd --system --gid 1001 tuskaex \
 && useradd  --system --uid 1001 --gid tuskaex --shell /usr/sbin/nologin tuskaex
USER tuskaex

CMD ["python", "-m", "services.lp_bridge.src.main"]
