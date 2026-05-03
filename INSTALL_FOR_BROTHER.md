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
