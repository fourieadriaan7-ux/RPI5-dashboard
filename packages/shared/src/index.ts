export type SourceName = "dnsmasq" | "neigh" | "nft";

export type DeviceStatus = "online" | "offline" | "unknown";

export type SourceHealth = {
  ok: boolean;
  checkedAt: string;
  message?: string;
};

export type Device = {
  id: string;
  mac?: string;
  ip?: string;
  hostname?: string;
  alias?: string;
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
