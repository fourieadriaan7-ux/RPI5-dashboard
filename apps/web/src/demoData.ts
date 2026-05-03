import type { DashboardSnapshot, Device } from "@pi-dashboard/shared";

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursFromNow = (hours: number): string => new Date(Date.now() + hours * 60 * 60_000).toISOString();
const gb = (value: number): number => value * 1_000_000_000;

const devices = (): Device[] => [
  {
    id: "office-laptop",
    mac: "24:4B:FE:3A:1C:9D",
    ip: "192.168.1.101",
    hostname: "office-laptop",
    alias: "Office Laptop",
    vendor: "Dell Inc.",
    displayName: "Office Laptop",
    status: "online",
    interface: "LAN",
    leaseExpiresAt: hoursFromNow(7),
    lastSeenAt: minutesAgo(1),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(112),
    txBytes: gb(15),
    rxRateBps: 480_000,
    txRateBps: 110_000,
    rxTodayBytes: gb(8.3),
    txTodayBytes: gb(1.2)
  },
  {
    id: "living-room-tv",
    mac: "AC:DE:48:00:11:22",
    ip: "192.168.1.102",
    hostname: "living-room-tv",
    alias: "Living Room TV",
    vendor: "Samsung Electronics",
    displayName: "Living Room TV",
    status: "online",
    interface: "Wi-Fi (wlan0)",
    leaseExpiresAt: hoursFromNow(4),
    lastSeenAt: minutesAgo(2),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(84),
    txBytes: gb(2.7),
    rxRateBps: 890_000,
    txRateBps: 70_000,
    rxTodayBytes: gb(6.1),
    txTodayBytes: gb(0.7)
  },
  {
    id: "lara-iphone",
    mac: "60:8C:0C:12:34:56",
    ip: "192.168.1.103",
    hostname: "lara-iphone",
    alias: "Lara iPhone",
    vendor: "Apple, Inc.",
    displayName: "Lara iPhone",
    status: "online",
    interface: "Wi-Fi (wlan0)",
    leaseExpiresAt: hoursFromNow(6),
    lastSeenAt: minutesAgo(1),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(29),
    txBytes: gb(5),
    rxRateBps: 350_000,
    txRateBps: 120_000,
    rxTodayBytes: gb(3.2),
    txTodayBytes: gb(0.6)
  },
  {
    id: "nas-storage",
    mac: "00:11:32:AA:BB:CC",
    ip: "192.168.1.104",
    hostname: "nas-storage",
    alias: "NAS Storage",
    vendor: "Synology Inc.",
    displayName: "NAS Storage",
    status: "online",
    interface: "LAN",
    leaseExpiresAt: hoursFromNow(3),
    lastSeenAt: minutesAgo(0),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(340),
    txBytes: gb(109),
    rxRateBps: 1_560_000,
    txRateBps: 260_000,
    rxTodayBytes: gb(54.7),
    txTodayBytes: gb(7.7)
  },
  {
    id: "unifi-ap",
    mac: "78:8A:20:AA:BB:DD",
    ip: "192.168.1.105",
    hostname: "unifi-ap",
    alias: "UniFi AP",
    vendor: "Ubiquiti Inc.",
    displayName: "UniFi AP",
    status: "online",
    interface: "LAN",
    leaseExpiresAt: hoursFromNow(12),
    lastSeenAt: minutesAgo(0),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(38),
    txBytes: gb(9),
    rxRateBps: 210_000,
    txRateBps: 42_000,
    rxTodayBytes: gb(1.8),
    txTodayBytes: gb(0.4)
  },
  {
    id: "gaming-pc",
    mac: "A0:36:BC:12:EF:34",
    ip: "192.168.1.106",
    hostname: "gaming-pc",
    alias: "Gaming PC",
    vendor: "ASUSTeK Computer Inc.",
    displayName: "Gaming PC",
    status: "online",
    interface: "LAN",
    leaseExpiresAt: hoursFromNow(5),
    lastSeenAt: minutesAgo(0),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(182),
    txBytes: gb(32),
    rxRateBps: 1_310_000,
    txRateBps: 360_000,
    rxTodayBytes: gb(33.1),
    txTodayBytes: gb(5.6)
  },
  {
    id: "lara-ipad",
    mac: "2C:20:0B:AA:11:82",
    ip: "192.168.1.107",
    hostname: "lara-ipad",
    alias: "Lara iPad",
    vendor: "Apple, Inc.",
    displayName: "Lara iPad",
    status: "offline",
    interface: "Wi-Fi (wlan0)",
    leaseExpiresAt: hoursFromNow(2),
    lastSeenAt: minutesAgo(18),
    sources: ["dnsmasq", "nft"],
    rxBytes: gb(12),
    txBytes: gb(1.1),
    rxRateBps: 0,
    txRateBps: 0,
    rxTodayBytes: gb(1.1),
    txTodayBytes: gb(0.2)
  },
  {
    id: "kitchen-speaker",
    mac: "B8:F9:37:44:55:66",
    ip: "192.168.1.108",
    hostname: "kitchen-speaker",
    alias: "Kitchen Speaker",
    vendor: "Sonos, Inc.",
    displayName: "Kitchen Speaker",
    status: "offline",
    interface: "Wi-Fi (wlan0)",
    leaseExpiresAt: hoursFromNow(1),
    lastSeenAt: minutesAgo(120),
    sources: ["dnsmasq", "nft"],
    rxBytes: gb(2.3),
    txBytes: gb(0.4),
    rxRateBps: 0,
    txRateBps: 0,
    rxTodayBytes: gb(0.3),
    txTodayBytes: gb(0.1)
  },
  {
    id: "internet-gateway",
    mac: "DC:A6:32:01:23:45",
    ip: "192.168.1.1",
    hostname: "internet-gateway",
    alias: "Internet Gateway",
    vendor: "Raspberry Pi Foundation",
    displayName: "Internet Gateway",
    status: "online",
    interface: "eth0",
    leaseExpiresAt: hoursFromNow(24),
    lastSeenAt: minutesAgo(0),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(470),
    txBytes: gb(86),
    rxRateBps: 560_000,
    txRateBps: 158_000,
    rxTodayBytes: gb(126.0),
    txTodayBytes: gb(17.4)
  },
  {
    id: "workstation",
    mac: "14:5F:94:AA:10:01",
    ip: "192.168.1.109",
    hostname: "workstation",
    alias: "Workstation",
    vendor: "Lenovo",
    displayName: "Workstation",
    status: "online",
    interface: "LAN",
    leaseExpiresAt: hoursFromNow(8),
    lastSeenAt: minutesAgo(4),
    sources: ["dnsmasq", "neigh", "nft"],
    rxBytes: gb(24),
    txBytes: gb(7),
    rxRateBps: 320_000,
    txRateBps: 90_000,
    rxTodayBytes: gb(4.6),
    txTodayBytes: gb(0.9)
  },
  {
    id: "smart-bulb",
    mac: "E0:17:C5:9A:BC:DE",
    ip: "192.168.1.110",
    hostname: "smart-bulb",
    alias: "Smart Bulb",
    vendor: "Philips Hue",
    displayName: "Smart Bulb",
    status: "offline",
    interface: "Wi-Fi (wlan0)",
    leaseExpiresAt: hoursFromNow(3),
    lastSeenAt: minutesAgo(180),
    sources: ["dnsmasq", "nft"],
    rxBytes: gb(1.4),
    txBytes: gb(0.2),
    rxRateBps: 0,
    txRateBps: 0,
    rxTodayBytes: gb(0.2),
    txTodayBytes: gb(0)
  }
];

export const demoSnapshot = (): DashboardSnapshot => {
  const capturedAt = new Date().toISOString();
  const rows = devices();
  const topTalkers = ["nas-storage", "gaming-pc", "office-laptop", "living-room-tv"]
    .map((id) => rows.find((device) => device.id === id))
    .filter((device): device is Device => Boolean(device));

  return {
    devices: {
      capturedAt,
      refreshAfterMs: 1000,
      devices: rows
    },
    summary: {
      capturedAt,
      onlineDevices: 18,
      totalDevices: 24,
      rxRateBps: 5_350_000,
      txRateBps: 1_050_000,
      rxTodayBytes: gb(126),
      txTodayBytes: gb(17.4),
      topTalkers,
      wan: {
        interface: "eth0",
        online: true,
        addresses: ["102.132.245.18"],
        rxBytes: gb(126),
        txBytes: gb(17.4)
      }
    },
    health: {
      capturedAt,
      sources: {
        dnsmasq: { ok: true, checkedAt: capturedAt },
        neighbors: { ok: true, checkedAt: capturedAt },
        nftables: { ok: true, checkedAt: capturedAt },
        sqlite: { ok: true, checkedAt: capturedAt }
      }
    }
  };
};

export const updateDemoAlias = (snapshot: DashboardSnapshot, mac: string, alias: string): DashboardSnapshot => {
  const normalized = mac.toLowerCase();
  const nextDevices = snapshot.devices.devices.map((device) => {
    if (device.mac?.toLowerCase() !== normalized) return device;
    const nextAlias = alias.trim() || undefined;
    return {
      ...device,
      alias: nextAlias,
      displayName: nextAlias ?? device.hostname ?? device.mac ?? device.ip ?? device.displayName
    };
  });

  return {
    ...snapshot,
    devices: { ...snapshot.devices, devices: nextDevices },
    summary: {
      ...snapshot.summary,
      topTalkers: snapshot.summary.topTalkers.map((device) => nextDevices.find((next) => next.id === device.id) ?? device)
    }
  };
};
