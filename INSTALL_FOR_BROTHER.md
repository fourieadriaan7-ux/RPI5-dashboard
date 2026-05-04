# Install On The Raspberry Pi 5

This folder contains the Pi Router Dashboard.

## What The Installer Does

The installer sets up the dashboard as a normal service on the Pi. It installs required OS packages, installs Node.js 22 LTS if the Pi has no supported Node version, builds the app, creates `/opt/pi-dashboard`, creates `/var/lib/pi-dashboard`, installs passive nftables traffic counters, and starts the dashboard on port `8080`.

It does not configure the Pi as a router. The Pi should already be routing/NATing traffic and using `dnsmasq` for DHCP leases. If Pi-hole is installed on the same Pi, the dashboard reads `/etc/pihole/pihole-FTL.db` locally for per-device DNS query counts and recent query logs.

## 1. Copy Or Unzip The Folder On The Pi

Put this whole folder anywhere on the Raspberry Pi, for example:

```bash
~/RPI5-dashboard
```

If it is a zip file:

```bash
unzip RPI5-dashboard.zip
cd RPI5-dashboard
```

## 2. Run The Installer

From inside the project folder, run:

```bash
sudo WAN_INTERFACE=eth0 LAN_INTERFACE=eth1 bash deploy/install-on-pi.sh
```

Use the real interface names for your Pi:

- `WAN_INTERFACE`: the uplink/fibre-box side, usually `eth0`
- `LAN_INTERFACE`: the LAN/switch/AP side, usually `eth1`

## 3. Open The Dashboard

Open this from a device on the same network:

```text
http://<pi-ip>:8080
```

To find the Pi IP:

```bash
hostname -I
```

The dashboard is served by the Pi itself. You do not need to run `npm` manually after the installer finishes.

## Optional: Set Up Pi-hole Logs

The dashboard can show Pi-hole data per device, including a query log popup, if Pi-hole runs on this same Raspberry Pi.

If Pi-hole is not installed yet:

```bash
curl -sSL https://install.pi-hole.net | bash
```

Use the Pi LAN interface during Pi-hole setup. If the Pi already uses `dnsmasq` for DHCP, leave Pi-hole DHCP disabled unless you specifically want to move DHCP into Pi-hole.

Make sure LAN devices use the Pi as DNS. If DHCP is still handled by `dnsmasq`, add or confirm this in the dnsmasq config, using the Pi LAN IP:

```text
dhcp-option=option:dns-server,192.168.1.1
```

Then restart dnsmasq:

```bash
sudo systemctl restart dnsmasq
```

The dashboard reads Pi-hole's local database here:

```text
/etc/pihole/pihole-FTL.db
```

The installer grants read access automatically if that file exists. If Pi-hole was installed after the dashboard, rerun the dashboard installer or run:

```bash
sudo setfacl -m u:pi-dashboard:x /etc/pihole
sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db
sudo test -f /etc/pihole/pihole-FTL.db-wal && sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db-wal
sudo test -f /etc/pihole/pihole-FTL.db-shm && sudo setfacl -m u:pi-dashboard:r /etc/pihole/pihole-FTL.db-shm
sudo systemctl restart pi-dashboard
```

Check that the dashboard service can read the database:

```bash
sudo -u pi-dashboard test -r /etc/pihole/pihole-FTL.db && echo "Pi-hole DB readable"
```

If the dashboard still shows no Pi-hole data, wait for a client to make DNS requests, then refresh the dashboard.

## Useful Commands

```bash
sudo systemctl status pi-dashboard
sudo journalctl -u pi-dashboard -f
sudo nft list table inet pi_dashboard_bw
sudo -u pi-dashboard test -r /etc/pihole/pihole-FTL.db && echo "Pi-hole DB readable"
```

## If The Dashboard Opens But Shows No Devices

Check these on the Pi:

```bash
ip -j neigh
cat /var/lib/misc/dnsmasq.leases
sudo nft list table inet pi_dashboard_bw
```

If `dnsmasq.leases` is somewhere else, rerun the installer with:

```bash
sudo LEASE_FILE=/path/to/dnsmasq.leases WAN_INTERFACE=eth0 LAN_INTERFACE=eth1 bash deploy/install-on-pi.sh
```

## If The Router Uses Different Interfaces

The expected setup is:

- `eth0`: WAN/fibre box
- `eth1`: LAN/switch/UniFi AP

If that is different, change the installer command:

```bash
sudo WAN_INTERFACE=<wan-name> LAN_INTERFACE=<lan-name> bash deploy/install-on-pi.sh
```
