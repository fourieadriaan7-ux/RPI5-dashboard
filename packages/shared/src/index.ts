export type SourceName = "dnsmasq" | "neigh" | "nft" | "router";

export type DeviceStatus = "online" | "offline" | "unknown";

export type DeviceIcon =
  | "auto"
  | "desktop"
  | "laptop"
  | "phone"
  | "tablet"
  | "tv"
  | "server"
  | "storage"
  | "router"
  | "wifi"
  | "speaker"
  | "game"
  | "camera"
  | "printer"
  | "light"
  | "vacuum";

export type SourceHealth = {
  ok: boolean;
  checkedAt: string;
  message?: string;
};

export type DeviceDnsStats = {
  queriesToday: number;
  blockedToday: number;
  lastQueryAt?: string;
  recentDomains: string[];
  recentQueries: DeviceDnsQuery[];
};

export type DeviceDnsQuery = {
  queriedAt: string;
  domain: string;
  type: string;
  result: "allowed" | "blocked";
};

export type Device = {
  id: string;
  mac?: string;
  ip?: string;
  hostname?: string;
  alias?: string;
  icon?: DeviceIcon;
  vendor?: string;
  displayName: string;
  status: DeviceStatus;
  interface?: string;
  leaseExpiresAt?: string;
  lastSeenAt?: string;
  sources: SourceName[];
  rxBytes: number;
  txBytes: number;
  rxRateBps: number;
  txRateBps: number;
  rxTodayBytes: number;
  txTodayBytes: number;
  dns?: DeviceDnsStats;
};

export type DeviceListResponse = {
  capturedAt: string;
  refreshAfterMs: number;
  devices: Device[];
};

export type SummaryResponse = {
  capturedAt: string;
  onlineDevices: number;
  totalDevices: number;
  rxRateBps: number;
  txRateBps: number;
  rxTodayBytes: number;
  txTodayBytes: number;
  topTalkers: Device[];
  wan: WanStatus;
};

export type WanStatus = {
  interface: string;
  online: boolean;
  addresses: string[];
  rxBytes?: number;
  txBytes?: number;
  message?: string;
};

export type HealthResponse = {
  capturedAt: string;
  sources: {
    dnsmasq: SourceHealth;
    nftables: SourceHealth;
    neighbors: SourceHealth;
    pihole: SourceHealth;
    sqlite: SourceHealth;
  };
};

export type DashboardSnapshot = {
  devices: DeviceListResponse;
  summary: SummaryResponse;
  health: HealthResponse;
};

export type AliasRequest = {
  alias: string;
};

export type DeviceSettingsRequest = {
  alias: string;
  icon: DeviceIcon;
};
