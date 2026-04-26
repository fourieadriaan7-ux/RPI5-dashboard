#!/usr/bin/env bash
set -euo pipefail

WAN_INTERFACE="${WAN_INTERFACE:-eth0}"
LAN_INTERFACE="${LAN_INTERFACE:-eth1}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo WAN_INTERFACE=${WAN_INTERFACE} LAN_INTERFACE=${LAN_INTERFACE} $0" >&2
  exit 1
fi

nft delete table inet pi_dashboard_bw 2>/dev/null || true

nft -f - <<NFT
table inet pi_dashboard_bw {
  set upload4 {
    type ipv4_addr
    flags dynamic
    counter
  }

  set download4 {
    type ipv4_addr
    flags dynamic
    counter
  }

  chain forward_count {
    type filter hook forward priority filter; policy accept;

    iifname "${LAN_INTERFACE}" oifname "${WAN_INTERFACE}" update @upload4 { ip saddr counter }
    iifname "${WAN_INTERFACE}" oifname "${LAN_INTERFACE}" update @download4 { ip daddr counter }
  }
}
NFT

echo "Installed pi_dashboard_bw accounting table for LAN=${LAN_INTERFACE}, WAN=${WAN_INTERFACE}."
echo "The pi-dashboard-nft systemd service will reinstall it at boot."
