import type {
  DashboardSnapshot,
  Device,
  DeviceListResponse,
  HealthResponse,
  SummaryResponse
} from "@pi-dashboard/shared";
import type { AppConfig } from "./config.js";
import { DashboardDb } from "./db.js";
import type { DhcpLease } from "./parsers/dnsmasq.js";
import type { NeighborEntry } from "./parsers/neigh.js";
import type { NftCounter } from "./parsers/nft.js";
import { readInterfaceStatus, readLeases, readNeighbors, readNftCounters } from "./system.js";
import { calculateRateBps, type CounterSample } from "./utils/rates.js";
import { lookupVendor } from "./vendors.js";

type SourceState<T> = {
  data: T;
  ok: boolean;
  checkedAt: Date;
  message?: string;
};

type TrafficState = {
  rxBytes: Map<string, number>;
  txBytes: Map<string, number>;
  rxRates: Map<string, number>;
  txRates: Map<string, number>;
  lastChangedAt: Map<string, Date>;
};

const emptyHealth = (checkedAt: Date) => ({ ok: false, checkedAt: checkedAt.toISOString(), message: "not checked yet" });

const macSuffix = (mac?: string): string => (mac ? mac.split(":").slice(-2).join(":").toUpperCase() : "unknown");

const displayNameFor = (lease?: DhcpLease, mac?: string, ip?: string): string =>
  lease?.hostname ?? `Unknown device ${mac ? macSuffix(mac) : ip ?? ""}`.trim();

const sourceHealth = <T>(source: SourceState<T>) => ({
  ok: source.ok,
  checkedAt: source.checkedAt.toISOString(),
  message: source.message
});

export class Collector {
  private leases: SourceState<DhcpLease[]> = {
    data: [],
    ok: false,
    checkedAt: new Date(0),
    message: "not checked yet"
  };

  private neighbors: SourceState<NeighborEntry[]> = {
    data: [],
    ok: false,
    checkedAt: new Date(0),
    message: "not checked yet"
  };

  private nftables: SourceState<TrafficState> = {
    data: {
      rxBytes: new Map(),
      txBytes: new Map(),
      rxRates: new Map(),
      txRates: new Map(),
      lastChangedAt: new Map()
    },
    ok: false,
    checkedAt: new Date(0),
    message: "not checked yet"
  };

  private previousRx = new Map<string, CounterSample>();
  private previousTx = new Map<string, CounterSample>();
  private timers: NodeJS.Timeout[] = [];
  private listeners = new Set<(snapshot: DashboardSnapshot) => void>();

  constructor(
    private readonly config: AppConfig,
    private readonly db: DashboardDb
  ) {}

  start(): void {
    void this.pollDevices();
    void this.pollCounters();
    void this.pollWan();
    this.timers.push(setInterval(() => void this.pollDevices(), this.config.pollDevicesMs));
    this.timers.push(setInterval(() => void this.pollCounters(), this.config.pollCountersMs));
    this.timers.push(setInterval(() => void this.pollWan(), this.config.pollDevicesMs));
  }

  stop(): void {
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
  }

  onSnapshot(listener: (snapshot: DashboardSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): DashboardSnapshot {
    const devices = this.devices();
    return {
      devices,
      summary: this.summary(devices),
      health: this.health()
    };
  }

  setAlias(mac: string, alias: string): DashboardSnapshot {
    this.db.setAlias(mac, alias);
    this.emit();
    return this.snapshot();
  }

  csv(): string {
    const headers = [
      "status",
      "displayName",
      "alias",
      "vendor",
      "hostname",
      "ip",
      "mac",
      "downloadRateBps",
      "uploadRateBps",
      "downloadedTodayBytes",
      "uploadedTodayBytes",
      "lastSeenAt",
      "interface",
      "sources"
    ];
    const rows = this.devices().devices.map((device) =>
      [
        device.status,
        device.displayName,
        device.alias ?? "",
        device.vendor ?? "",
        device.hostname ?? "",
        device.ip ?? "",
        device.mac ?? "",
        Math.round(device.rxRateBps),
        Math.round(device.txRateBps),
        device.rxTodayBytes,
        device.txTodayBytes,
        device.lastSeenAt ?? "",
        device.interface ?? "",
        device.sources.join("|")
      ].map(csvCell)
    );
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private async pollDevices(): Promise<void> {
    const checkedAt = new Date();
    try {
      const [leases, neighbors] = await Promise.allSettled([readLeases(this.config.leaseFile), readNeighbors()]);

      if (leases.status === "fulfilled") {
        this.leases = { data: leases.value, ok: true, checkedAt };
      } else {
        this.leases = { ...this.leases, ok: false, checkedAt, message: leases.reason?.message ?? String(leases.reason) };
      }

      if (neighbors.status === "fulfilled") {
        this.neighbors = { data: neighbors.value, ok: true, checkedAt };
      } else {
        this.neighbors = {
          ...this.neighbors,
          ok: false,
          checkedAt,
          message: neighbors.reason?.message ?? String(neighbors.reason)
        };
      }
    } finally {
      this.emit();
    }
  }

  private async pollCounters(): Promise<void> {
    const checkedAt = new Date();
    try {
      const [upload, download] = await Promise.all([readNftCounters("upload4"), readNftCounters("download4")]);
      this.updateTraffic(download, upload, checkedAt);
      this.nftables = { ...this.nftables, ok: true, checkedAt, message: undefined };
    } catch (error) {
      this.nftables = {
        ...this.nftables,
        ok: false,
        checkedAt,
        message: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.emit();
    }
  }

  private updateTraffic(rx: NftCounter[], tx: NftCounter[], sampledAt: Date): void {
    const rxBytes = new Map<string, number>();
    const txBytes = new Map<string, number>();
    const rxRates = new Map<string, number>();
    const txRates = new Map<string, number>();
    const changed = new Map(this.nftables.data.lastChangedAt);
    const samples = [];

    for (const counter of rx) {
      const current = { bytes: counter.bytes, sampledAt: sampledAt.getTime() };
      const previous = this.previousRx.get(counter.ip);
      const deltaBytes = previous && counter.bytes >= previous.bytes ? counter.bytes - previous.bytes : 0;
      rxBytes.set(counter.ip, counter.bytes);
      rxRates.set(counter.ip, calculateRateBps(previous, current));
      if (deltaBytes > 0) changed.set(counter.ip, sampledAt);
      samples.push({ ip: counter.ip, direction: "rx" as const, rawBytes: counter.bytes, deltaBytes, sampledAt });
      this.previousRx.set(counter.ip, current);
    }

    for (const counter of tx) {
      const current = { bytes: counter.bytes, sampledAt: sampledAt.getTime() };
      const previous = this.previousTx.get(counter.ip);
      const deltaBytes = previous && counter.bytes >= previous.bytes ? counter.bytes - previous.bytes : 0;
      txBytes.set(counter.ip, counter.bytes);
      txRates.set(counter.ip, calculateRateBps(previous, current));
      if (deltaBytes > 0) changed.set(counter.ip, sampledAt);
      samples.push({ ip: counter.ip, direction: "tx" as const, rawBytes: counter.bytes, deltaBytes, sampledAt });
      this.previousTx.set(counter.ip, current);
    }

    this.db.insertTrafficSamples(samples);
    this.nftables.data = { rxBytes, txBytes, rxRates, txRates, lastChangedAt: changed };
  }

  private devices(): DeviceListResponse {
    const now = new Date();
    const byIp = new Map<string, Partial<Device> & { lease?: DhcpLease; neighbor?: NeighborEntry }>();
    const today = this.db.todayTotals();
    const aliases = this.db.aliases();

    for (const lease of this.leases.data) {
      const existing = byIp.get(lease.ip) ?? {};
      byIp.set(lease.ip, {
        ...existing,
        lease,
        ip: lease.ip,
        mac: lease.mac,
        hostname: lease.hostname,
        sources: [...new Set([...(existing.sources ?? []), "dnsmasq" as const])]
      });
    }

    for (const neighbor of this.neighbors.data) {
      const existing = byIp.get(neighbor.ip) ?? {};
      byIp.set(neighbor.ip, {
        ...existing,
        neighbor,
        ip: neighbor.ip,
        mac: existing.mac ?? neighbor.mac,
        interface: neighbor.dev,
        sources: [...new Set([...(existing.sources ?? []), "neigh" as const])]
      });
    }

    for (const ip of new Set([...this.nftables.data.rxBytes.keys(), ...this.nftables.data.txBytes.keys()])) {
      const existing = byIp.get(ip) ?? {};
      byIp.set(ip, {
        ...existing,
        ip,
        sources: [...new Set([...(existing.sources ?? []), "nft" as const])]
      });
    }

    const devices = [...byIp.entries()]
      .map(([ip, partial]) => {
        const lastSeen = this.lastSeenFor(ip, partial.neighbor, now);
        const online = lastSeen ? now.getTime() - lastSeen.getTime() <= this.config.onlineWindowMs : false;
        const totals = today.get(ip) ?? { rx: 0, tx: 0 };
        const sources = partial.sources ?? [];
        const mac = partial.mac ?? partial.neighbor?.mac;
        const alias = mac ? aliases.get(mac.toLowerCase()) : undefined;
        const vendor = lookupVendor(mac);

        return {
          id: mac ?? ip,
          ip,
          mac,
          hostname: partial.hostname,
          alias,
          vendor,
          displayName: alias ?? displayNameFor(partial.lease, mac, ip),
          status: online ? "online" : sources.length > 0 ? "offline" : "unknown",
          interface: partial.interface ?? partial.neighbor?.dev,
          leaseExpiresAt: partial.lease?.expiresAt?.toISOString(),
          lastSeenAt: lastSeen?.toISOString(),
          sources,
          rxBytes: this.nftables.data.rxBytes.get(ip) ?? 0,
          txBytes: this.nftables.data.txBytes.get(ip) ?? 0,
          rxRateBps: this.nftables.data.rxRates.get(ip) ?? 0,
          txRateBps: this.nftables.data.txRates.get(ip) ?? 0,
          rxTodayBytes: totals.rx,
          txTodayBytes: totals.tx
        } satisfies Device;
      })
      .sort((a, b) => b.rxRateBps + b.txRateBps - (a.rxRateBps + a.txRateBps));

    return {
      capturedAt: now.toISOString(),
      refreshAfterMs: this.config.pollCountersMs,
      devices
    };
  }

  private lastSeenFor(ip: string, neighbor: NeighborEntry | undefined, now: Date): Date | undefined {
    const trafficSeen = this.nftables.data.lastChangedAt.get(ip);
    if (trafficSeen) return trafficSeen;
    if (neighbor) return now;
    return undefined;
  }

  private summary(deviceList: DeviceListResponse): SummaryResponse {
    const devices = deviceList.devices;
    return {
      capturedAt: deviceList.capturedAt,
      onlineDevices: devices.filter((device) => device.status === "online").length,
      totalDevices: devices.length,
      rxRateBps: devices.reduce((sum, device) => sum + device.rxRateBps, 0),
      txRateBps: devices.reduce((sum, device) => sum + device.txRateBps, 0),
      rxTodayBytes: devices.reduce((sum, device) => sum + device.rxTodayBytes, 0),
      txTodayBytes: devices.reduce((sum, device) => sum + device.txTodayBytes, 0),
      topTalkers: [...devices]
        .sort((a, b) => b.rxTodayBytes + b.txTodayBytes - (a.rxTodayBytes + a.txTodayBytes))
        .slice(0, 5),
      wan: this.wanStatus()
    };
  }

  private wanStatus(): SummaryResponse["wan"] {
    return this.cachedWanStatus;
  }

  private health(): HealthResponse {
    const checkedAt = new Date();
    let sqlite: { ok: boolean; checkedAt: string; message?: string } = {
      ok: false,
      checkedAt: checkedAt.toISOString(),
      message: "unavailable"
    };
    try {
      sqlite = { ok: this.db.health(), checkedAt: checkedAt.toISOString() };
    } catch (error) {
      sqlite = { ok: false, checkedAt: checkedAt.toISOString(), message: error instanceof Error ? error.message : String(error) };
    }

    return {
      capturedAt: checkedAt.toISOString(),
      sources: {
        dnsmasq: this.leases.checkedAt.getTime() === 0 ? emptyHealth(checkedAt) : sourceHealth(this.leases),
        nftables: this.nftables.checkedAt.getTime() === 0 ? emptyHealth(checkedAt) : sourceHealth(this.nftables),
        neighbors: this.neighbors.checkedAt.getTime() === 0 ? emptyHealth(checkedAt) : sourceHealth(this.neighbors),
        sqlite
      }
    };
  }

  private cachedWanStatus: SummaryResponse["wan"] = {
    interface: "unknown",
    online: false,
    addresses: [],
    message: "not checked yet"
  };

  async pollWan(): Promise<void> {
    try {
      this.cachedWanStatus = await readInterfaceStatus(this.config.wanInterface);
    } catch (error) {
      this.cachedWanStatus = {
        interface: this.config.wanInterface,
        online: false,
        addresses: [],
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

const csvCell = (value: unknown): string => {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};
