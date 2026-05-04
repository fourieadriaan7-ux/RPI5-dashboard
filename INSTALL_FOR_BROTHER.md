# Install On The Raspberry Pi 5

This folder contains the Pi Router Dashboard.

## What The Installer Does

The installer sets up the dashboard as a normal service on the Pi. It installs required OS packages, installs Node.js 22 LTS if the Pi has no supported Node version, builds the app, creates `/opt/pi-dashboard`, creates `/var/lib/pi-dashboard`, installs passive nftables traffic counters, and starts the dashboard on port `8080`.

It does not configure the Pi as a router. The Pi should already be routing/NATing traffic and using `dnsmasq` for DHCP leases.

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

## Useful Commands

```bash
sudo systemctl status pi-dashboard
sudo journalctl -u pi-dashboard -f
sudo nft list table inet pi_dashboard_bw
```

## If Devices Show But Download/Upload Stay At Zero

This means device discovery is working, but the passive traffic counters are not seeing routed traffic.

Run this on the Pi:

```bash
cd /opt/pi-dashboard
sudo bash deploy/check-traffic.sh
```

While the script is sampling, open a website or run a speed test from a LAN device.

If the script says the counters did not move, check these first:

- `WAN_INTERFACE` and `LAN_INTERFACE` in `/etc/pi-dashboard.env` must be the real uplink and LAN interfaces.
- LAN devices must use the Pi LAN IP as their default gateway.
- The Pi must be routing/NATing traffic. If traffic bypasses the Pi, the dashboard can still see devices from DHCP/ARP, but it cannot count their internet usage.

After changing interfaces, reinstall the nftables accounting table and restart:

```bash
sudo systemctl restart pi-dashboard-nft
sudo systemctl restart pi-dashboard
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
