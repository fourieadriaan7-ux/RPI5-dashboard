#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/pi-dashboard.env}"
SAMPLE_SECONDS="${SAMPLE_SECONDS:-10}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

WAN_INTERFACE="${WAN_INTERFACE:-eth0}"
LAN_INTERFACE="${LAN_INTERFACE:-eth1}"
PORT="${PORT:-8080}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

print_header() {
  echo
  echo "== $1 =="
}

nft_bytes() {
  local set_name="$1"
  local json
  if ! json="$(nft -j list set inet pi_dashboard_bw "${set_name}" 2>/dev/null)"; then
    echo 0
    return
  fi

  if ! need_cmd node; then
    echo 0
    return
  fi

  printf "%s" "${json}" | node -e '
let input = "";
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", () => {
  let total = 0;
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.counter && Number.isFinite(Number(value.counter.bytes))) {
      total += Number(value.counter.bytes);
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(walk);
      else walk(child);
    }
  };
  try {
    walk(JSON.parse(input));
  } catch {
    total = 0;
  }
  console.log(total);
});
'
}

print_header "Config"
echo "WAN_INTERFACE=${WAN_INTERFACE}"
echo "LAN_INTERFACE=${LAN_INTERFACE}"
echo "PORT=${PORT}"
echo "ENV_FILE=${ENV_FILE}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Warning: run with sudo for the most reliable nftables checks."
fi

print_header "Services"
if need_cmd systemctl; then
  systemctl --no-pager --plain is-active pi-dashboard pi-dashboard-nft || true
fi

print_header "Forwarding"
if need_cmd sysctl; then
  echo -n "net.ipv4.ip_forward="
  sysctl -n net.ipv4.ip_forward || true
fi

print_header "Interfaces"
ip -br addr show dev "${WAN_INTERFACE}" || true
ip -br addr show dev "${LAN_INTERFACE}" || true

print_header "Routes"
ip route || true

print_header "Dashboard health"
if need_cmd curl; then
  curl -fsS "http://127.0.0.1:${PORT}/api/health" || true
  echo
else
  echo "curl is not installed."
fi

print_header "nftables accounting table"
nft list table inet pi_dashboard_bw || true

print_header "Counter sample"
echo "Sampling for ${SAMPLE_SECONDS}s. Generate traffic from a LAN client now."
upload_before="$(nft_bytes upload4)"
download_before="$(nft_bytes download4)"
sleep "${SAMPLE_SECONDS}"
upload_after="$(nft_bytes upload4)"
download_after="$(nft_bytes download4)"

upload_delta=$((upload_after - upload_before))
download_delta=$((download_after - download_before))

echo "upload bytes:   ${upload_before} -> ${upload_after}  delta=${upload_delta}"
echo "download bytes: ${download_before} -> ${download_after}  delta=${download_delta}"

print_header "Result"
if [[ "${upload_delta}" -gt 0 || "${download_delta}" -gt 0 ]]; then
  echo "Traffic counters are moving. If the dashboard still shows zero, check journalctl -u pi-dashboard -n 100."
else
  echo "Traffic counters did not move during the sample."
  echo "Most common causes:"
  echo "1. WAN_INTERFACE or LAN_INTERFACE is wrong in /etc/pi-dashboard.env."
  echo "2. Clients are not using the Pi LAN IP as their default gateway."
  echo "3. The Pi is bridging or observing the network instead of routing forwarded IPv4 packets."
  echo "4. There was no real internet/LAN traffic during the sample window."
fi
