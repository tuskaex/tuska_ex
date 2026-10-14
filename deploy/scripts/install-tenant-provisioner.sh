#!/usr/bin/env bash
#
# Install (or refresh) the systemd timer that runs tenant-provisioner.sh every
# minute. Idempotent: safe to re-run after a deploy.
#   sudo bash deploy/scripts/install-tenant-provisioner.sh
set -euo pipefail

DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

cat > /etc/systemd/system/tuskaex-tenant-provisioner.service <<EOF
[Unit]
Description=TuskaEx white-label domain provisioner (nginx vhost + SSL)
After=network-online.target docker.service nginx.service

[Service]
Type=oneshot
Environment=REPO_DIR=$DIR
ExecStart=/bin/bash $DIR/deploy/scripts/tenant-provisioner.sh
EOF

cat > /etc/systemd/system/tuskaex-tenant-provisioner.timer <<'EOF'
[Unit]
Description=Run the TuskaEx white-label domain provisioner every minute

[Timer]
OnBootSec=60
OnUnitActiveSec=60
AccuracySec=5

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now tuskaex-tenant-provisioner.timer >/dev/null
echo "✓ white-label domain provisioner active (every minute)"
echo "  logs: journalctl -u tuskaex-tenant-provisioner -n 50"
