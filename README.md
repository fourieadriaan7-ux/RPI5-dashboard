# Pi Router Dashboard

A lightweight TypeScript dashboard for a Raspberry Pi 5 running Raspberry Pi OS as a router.

It shows known/connected LAN devices, MAC addresses, DHCP hostnames, live upload/download rate, and usage totals for today.

If you are installing this on the Raspberry Pi from an emailed/copied folder, start with [INSTALL_FOR_BROTHER.md](./INSTALL_FOR_BROTHER.md).

To make a clean zip for email from this machine:

```bash
bash deploy/make-email-zip.sh
```

That creates `pi-dashboard-for-brother.zip` without `node_modules`, local databases, or build output.

Extra dashboard features:

- editable device nicknames
- basic MAC vendor labels
- top bandwidth users for today
- Pi-hole per-device DNS query counts and recent query log popup when Pi-hole runs on the Pi
- CSV export
- WAN interface status
- new-device notice when an unseen device appears online

## Router Assumptions

- WAN/uplink: `eth0`
- LAN/switch/UniFi AP side: `eth1`
- DHCP: `dnsmasq`
- NAT/firewall: already configured outside this app
- Access: open on the LAN at `http://<pi-ip>:8080`

## How It Works

- `dnsmasq` leases identify devices by IP, MAC, and hostname.
- `ip -j neigh` helps determine recently active devices.
- nftables dynamic sets count forwarded bytes per LAN IP:
  - upload is `eth1 -> eth0`, keyed by source IP
  - download is `eth0 -> eth1`, keyed by destination IP
- Pi-hole data is read locally from `/etc/pihole/pihole-FTL.db` when Pi-hole is installed on the same Pi. The dashboard reads the local SQLite database directly; it does not use the Pi-hole web API.
- SQLite stores samples so totals survive dashboard restarts.

## Development

Use Node `20.19.0` or newer. On Windows, run `npm install` after cloning so native packages such as `better-sqlite3` install the correct Windows binary.

```bash
npm install
npm run build
npm test
```

For local development, run the backend and frontend separately:

```bash
cp .env.example .env
npm run dev
```

Open the Vite app at `http://127.0.0.1:5174`. The frontend dev server proxies `/api` and `/events` to the dev backend on port `18080`.

If a previous run is still holding the ports, stop it with:

```bash
npm run stop
```

For a production-style local run:

```bash
DATABASE_PATH=./data/pi-dashboard.sqlite npm start
```

Then open `http://localhost:8080`.

## Pi Installation

Build on the Pi or copy a built checkout to the Pi.

Fast path from inside the unzipped/copied project folder on the Pi:

```bash
sudo WAN_INTERFACE=eth0 LAN_INTERFACE=eth1 bash deploy/install-on-pi.sh
```

```bash
sudo mkdir -p /opt/pi-dashboard /var/lib/pi-dashboard
sudo cp -R . /opt/pi-dashboard
cd /opt/pi-dashboard
npm ci
npm run build
```

Create the service user and config:

```bash
sudo useradd --system --home /var/lib/pi-dashboard --shell /usr/sbin/nologin pi-dashboard || true
sudo chown -R pi-dashboard:pi-dashboard /var/lib/pi-dashboard
sudo cp deploy/pi-dashboard.env.example /etc/pi-dashboard.env
sudo cp deploy/pi-dashboard.service /etc/systemd/system/pi-dashboard.service
```

Allow the service to read the dnsmasq lease file if needed:

```bash
sudo setfacl -m u:pi-dashboard:r /var/lib/misc/dnsmasq.leases
```

Install the passive nftables accounting table:

```bash
sudo WAN_INTERFACE=eth0 LAN_INTERFACE=eth1 bash deploy/install-nft-accounting.sh
```

Enable and start the dashboard:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pi-dashboard
```

Open:

```text
http://<pi-ip>:8080
```

## Optional Pi-hole DNS Logs

The dashboard can show per-device Pi-hole DNS data when Pi-hole runs on the same Raspberry Pi.

Install Pi-hole normally on the Pi if it is not installed yet:

```bash
curl -sSL https://install.pi-hole.net | bash
```

During Pi-hole setup, use the Pi LAN interface. If this Pi already uses `dnsmasq` for DHCP, do not enable Pi-hole DHCP unless you plan to migrate DHCP to Pi-hole. The dashboard can keep using your existing `dnsmasq` lease file.

For Pi-hole logs to show per-device traffic, LAN clients must use the Pi as their DNS server. If DHCP is handled by `dnsmasq`, add or confirm a DNS-server option like this, using the Pi LAN IP:

```text
dhcp-option=option:dns-server,192.168.1.1
```

Then restart DHCP/DNS:

```bash
sudo systemctl restart dnsmasq
```

The dashboard reads Pi-hole's local database from:

```text
/etc/pihole/pihole-FTL.db
```

`deploy/install-on-pi.sh` sets `PIHOLE_DB_PATH=/etc/pihole/pihole-FTL.db` and grants the `pi-dashboard` service user read access when that database exists. If you install Pi-hole after installing the dashboard, either rerun the installer or run:

```bash
sudo setfacl -m u:pi-dashboard:x /etc/pihole
sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db
sudo test -f /etc/pihole/pihole-FTL.db-wal && sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db-wal
sudo test -f /etc/pihole/pihole-FTL.db-shm && sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db-shm
sudo systemctl restart pi-dashboard
```

If your Pi-hole database is somewhere else, set `PIHOLE_DB_PATH` in `/etc/pi-dashboard.env` and restart `pi-dashboard`.

## Persistence Note

`deploy/install-nft-accounting.sh` installs the accounting table immediately. If your Pi does not already restore nftables rules at boot, merge the generated table into `/etc/nftables.conf` or run the script during boot before starting the dashboard.

## Useful Checks

```bash
sudo nft list table inet pi_dashboard_bw
nft -j list set inet pi_dashboard_bw upload4
nft -j list set inet pi_dashboard_bw download4
ip -j neigh
cat /var/lib/misc/dnsmasq.leases
systemctl status pi-dashboard
journalctl -u pi-dashboard -f
sudo -u pi-dashboard test -r /etc/pihole/pihole-FTL.db && echo "Pi-hole DB readable"
```
