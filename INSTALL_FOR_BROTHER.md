# Install On The Raspberry Pi 5

This folder contains the Pi Router Dashboard.

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

The installer copies the project to `/opt/pi-dashboard`, installs packages, builds the dashboard, installs passive nftables bandwidth counters, and starts the `pi-dashboard` systemd service.

## 3. Open The Dashboard

Open this from a device on the same network:

```text
http://<pi-ip>:8080
```

To find the Pi IP:

```bash
hostname -I
```

## Useful Commands

```bash
systemctl status pi-dashboard
journalctl -u pi-dashboard -f
sudo nft list table inet pi_dashboard_bw
```

## If The Router Uses Different Interfaces

The expected setup is:

- `eth0`: WAN/fibre box
- `eth1`: LAN/switch/UniFi AP

If that is different, change the installer command:

```bash
sudo WAN_INTERFACE=<wan-name> LAN_INTERFACE=<lan-name> bash deploy/install-on-pi.sh
```
