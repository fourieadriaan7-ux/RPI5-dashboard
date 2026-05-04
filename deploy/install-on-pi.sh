#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/pi-dashboard}"
DATA_DIR="${DATA_DIR:-/var/lib/pi-dashboard}"
SERVICE_USER="${SERVICE_USER:-pi-dashboard}"
WAN_INTERFACE="${WAN_INTERFACE:-eth0}"
LAN_INTERFACE="${LAN_INTERFACE:-eth1}"
PORT="${PORT:-8080}"
LEASE_FILE="${LEASE_FILE:-/var/lib/misc/dnsmasq.leases}"
PIHOLE_DB_PATH="${PIHOLE_DB_PATH:-/etc/pihole/pihole-FTL.db}"
REPO_URL="${REPO_URL:-}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash $0" >&2
  exit 1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

echo "Installing OS packages..."
apt-get update
apt-get install -y curl git nftables acl build-essential python3

NODE_MAJOR=0
NODE_MINOR=0
if need_cmd node; then
  NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
  NODE_MINOR="$(node -p "Number(process.versions.node.split('.')[1])" 2>/dev/null || echo 0)"
fi

if [[ "${NODE_MAJOR}" -lt 20 || ( "${NODE_MAJOR}" -eq 20 && "${NODE_MINOR}" -lt 19 ) ]]; then
  echo "Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if [[ -n "${REPO_URL}" && ! -d "${APP_DIR}/.git" ]]; then
  echo "Cloning ${REPO_URL} into ${APP_DIR}..."
  rm -rf "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
elif [[ "${SOURCE_DIR}" != "${APP_DIR}" ]]; then
  echo "Copying project from ${SOURCE_DIR} to ${APP_DIR}..."
  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}"
  tar \
    --exclude="./node_modules" \
    --exclude="./apps/*/node_modules" \
    --exclude="./apps/*/dist" \
    --exclude="./apps/*/data" \
    --exclude="./packages/*/dist" \
    --exclude="./*.sqlite" \
    --exclude="./*.sqlite-shm" \
    --exclude="./*.sqlite-wal" \
    --exclude="./*.tsbuildinfo" \
    --exclude="./.git" \
    -C "${SOURCE_DIR}" -cf - . | tar -C "${APP_DIR}" -xf -
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "No app found at ${APP_DIR}; package.json is missing." >&2
  exit 1
fi

echo "Creating service user and data directory..."
useradd --system --home "${DATA_DIR}" --shell /usr/sbin/nologin "${SERVICE_USER}" 2>/dev/null || true
mkdir -p "${DATA_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DATA_DIR}"

echo "Writing /etc/pi-dashboard.env..."
cat >/etc/pi-dashboard.env <<ENV
HOST=0.0.0.0
PORT=${PORT}
WAN_INTERFACE=${WAN_INTERFACE}
LAN_INTERFACE=${LAN_INTERFACE}
LEASE_FILE=${LEASE_FILE}
PIHOLE_DB_PATH=${PIHOLE_DB_PATH}
DATABASE_PATH=${DATA_DIR}/pi-dashboard.sqlite
POLL_COUNTERS_MS=1000
POLL_DEVICES_MS=10000
ONLINE_WINDOW_MS=120000
ENV

if [[ -f "${LEASE_FILE}" ]]; then
  echo "Granting lease-file read access..."
  setfacl -m "u:${SERVICE_USER}:r" "${LEASE_FILE}" || true
else
  echo "Lease file not found yet at ${LEASE_FILE}; continuing."
fi

if [[ -f "${PIHOLE_DB_PATH}" ]]; then
  echo "Granting Pi-hole database read access..."
  setfacl -m "u:${SERVICE_USER}:x" "$(dirname "${PIHOLE_DB_PATH}")" || true
  for PIHOLE_FILE in "${PIHOLE_DB_PATH}" "${PIHOLE_DB_PATH}-wal" "${PIHOLE_DB_PATH}-shm"; do
    [[ -f "${PIHOLE_FILE}" ]] && setfacl -m "u:${SERVICE_USER}:r" "${PIHOLE_FILE}" || true
  done
else
  echo "Pi-hole database not found yet at ${PIHOLE_DB_PATH}; continuing."
fi

echo "Installing nftables accounting table..."
WAN_INTERFACE="${WAN_INTERFACE}" LAN_INTERFACE="${LAN_INTERFACE}" bash "${APP_DIR}/deploy/install-nft-accounting.sh"

echo "Installing npm dependencies and building..."
cd "${APP_DIR}"
npm ci
npm run build

echo "Installing systemd service..."
cp "${APP_DIR}/deploy/pi-dashboard.service" /etc/systemd/system/pi-dashboard.service
cp "${APP_DIR}/deploy/pi-dashboard-nft.service" /etc/systemd/system/pi-dashboard-nft.service
systemctl daemon-reload
systemctl enable --now pi-dashboard-nft
systemctl enable --now pi-dashboard

echo
echo "Pi Router Dashboard installed."
echo "Open: http://$(hostname -I | awk '{print $1}'):${PORT}"
echo
echo "Useful commands:"
echo "  systemctl status pi-dashboard"
echo "  journalctl -u pi-dashboard -f"
echo "  sudo nft list table inet pi_dashboard_bw"
