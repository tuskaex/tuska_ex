#!/usr/bin/env bash
#
# Install the TuskaEx brand logo everywhere the apps expect it.
#
# The codebase references the logo from four separate places (each app
# bundles its own copy — the trader and admin Next.js apps serve from
# their own public/ dir, and the email templates embed theirs at send
# time). This script takes ONE source file and fans it out to all four,
# so the brand can never drift between the web app, the admin panel and
# transactional email.
#
# Usage:
#   ./scripts/install-logo.sh /path/to/tuskaex-logo.png
#   ./scripts/install-logo.sh /path/to/logo.png /path/to/favicon.png
#
# Arg 1 = full logo (wordmark lockup). Recommended ~880x192 PNG,
#         transparent background so it works on light AND dark chrome.
# Arg 2 = square icon/favicon (optional). Recommended 512x512 PNG.
#         Omitted → the full logo is reused for the favicon slot.
#
# After running: rebuild the frontend images, or the browser keeps the
# old bundled asset:
#   docker compose build trader-frontend admin-frontend
#   docker compose up -d trader-frontend admin-frontend
set -euo pipefail

SRC_LOGO="${1:-}"
SRC_ICON="${2:-$SRC_LOGO}"

if [ -z "$SRC_LOGO" ]; then
  echo "usage: $0 <logo.png> [favicon.png]" >&2
  exit 1
fi
if [ ! -f "$SRC_LOGO" ]; then
  echo "error: logo not found: $SRC_LOGO" >&2
  exit 1
fi
if [ ! -f "$SRC_ICON" ]; then
  echo "error: favicon not found: $SRC_ICON" >&2
  exit 1
fi

# Resolve the repo root from this script's location so the paths below
# work no matter where the script is invoked from.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Destination → which source file feeds it.
install_one() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  cp -f "$src" "$dest"
  echo "  ✓ $(basename "$src")  →  ${dest#"$REPO_DIR"/}"
}

echo "Installing TuskaEx logo from: $SRC_LOGO"
install_one "$SRC_LOGO" "$REPO_DIR/frontend/trader/public/marketing/tuskaex-logo.png"
install_one "$SRC_LOGO" "$REPO_DIR/frontend/admin/public/tuskaex-logo.png"
install_one "$SRC_LOGO" "$REPO_DIR/backend/packages/common/src/email_templates/assets/tuskaex-logo.png"
echo "Installing favicon from: $SRC_ICON"
install_one "$SRC_ICON" "$REPO_DIR/frontend/trader/public/marketing/tuskaex_fevicon.png"

echo
echo "Done. Rebuild the frontends so the new asset ships in the bundle:"
echo "  docker compose build trader-frontend admin-frontend"
echo "  docker compose up -d trader-frontend admin-frontend"
echo "Then hard-refresh the browser (Ctrl+Shift+R)."
