import path from "node:path";

export type AppConfig = {
  host: string;
  port: number;
  wanInterface: string;
  lanInterface: string;
  leaseFile: string;
  databasePath: string;
  pollCountersMs: number;
  pollDevicesMs: number;
  onlineWindowMs: number;
  webDistPath: string;
};

const numberFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const loadConfig = (): AppConfig => ({
  host: process.env.HOST ?? "0.0.0.0",
  port: numberFromEnv("PORT", 8080),
  wanInterface: process.env.WAN_INTERFACE ?? "eth0",
  lanInterface: process.env.LAN_INTERFACE ?? "eth1",
  leaseFile: process.env.LEASE_FILE ?? "/var/lib/misc/dnsmasq.leases",
  databasePath: process.env.DATABASE_PATH ?? "/var/lib/pi-dashboard/pi-dashboard.sqlite",
  pollCountersMs: numberFromEnv("POLL_COUNTERS_MS", 1000),
  pollDevicesMs: numberFromEnv("POLL_DEVICES_MS", 10000),
  onlineWindowMs: numberFromEnv("ONLINE_WINDOW_MS", 120000),
  webDistPath:
    process.env.WEB_DIST_PATH ??
    path.resolve(process.cwd(), "apps/web/dist")
});
