import {
  Activity,
  AlertCircle,
  Database,
  Download,
  FileDown,
  Globe2,
  Laptop,
  Monitor,
  Moon,
  PieChart,
  RefreshCw,
  Search,
  Server,
  Smartphone,
  Speaker,
  Sun,
  Upload,
  Users,
  Wifi,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSnapshot, Device } from "@pi-dashboard/shared";
import { fetchSnapshot, setDeviceAlias } from "./api.js";
import { demoSnapshot, updateDemoAlias } from "./demoData.js";
import { formatBytes, formatDateTime, formatRate, formatTime } from "./format.js";

type Filter = "all" | "online" | "offline";
type DataMode = "live" | "demo";
type ThemeMode = "dark" | "light";
type SortDirection = "asc" | "desc";
type SortKey = "status" | "device" | "vendor" | "ip" | "mac" | "down" | "up" | "total" | "lastSeen" | "interface";

const tableColumns: Array<{ key: SortKey; label: string }> = [
  { key: "status", label: "Status" },
  { key: "device", label: "Device" },
  { key: "vendor", label: "Vendor" },
  { key: "ip", label: "IP" },
  { key: "mac", label: "MAC" },
  { key: "down", label: "Down" },
  { key: "up", label: "Up" },
  { key: "total", label: "Total today" },
  { key: "lastSeen", label: "Last seen" },
  { key: "interface", label: "Interface" }
];

const emptySnapshot: DashboardSnapshot = {
  devices: { capturedAt: new Date(0).toISOString(), refreshAfterMs: 1000, devices: [] },
  summary: {
    capturedAt: new Date(0).toISOString(),
    onlineDevices: 0,
    totalDevices: 0,
    rxRateBps: 0,
    txRateBps: 0,
    rxTodayBytes: 0,
    txTodayBytes: 0,
    topTalkers: [],
    wan: {
      interface: "unknown",
      online: false,
      addresses: [],
      message: "not checked yet"
    }
  },
  health: {
    capturedAt: new Date(0).toISOString(),
    sources: {
      dnsmasq: { ok: false, checkedAt: new Date(0).toISOString() },
      neighbors: { ok: false, checkedAt: new Date(0).toISOString() },
      nftables: { ok: false, checkedAt: new Date(0).toISOString() },
      sqlite: { ok: false, checkedAt: new Date(0).toISOString() }
    }
  }
};

export function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("online");
  const [selected, setSelected] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState<Device | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("live");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const seenDevices = useRef(new Set<string>());

  const refresh = async () => {
    try {
      updateSnapshot(dataMode === "demo" ? demoSnapshot() : await fetchSnapshot());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateSnapshot = (next: DashboardSnapshot) => {
    setSnapshot(next);
    setSelected((current) => (current ? next.devices.devices.find((device) => device.id === current.id) ?? current : null));
    const known = seenDevices.current;
    const hadKnownDevices = known.size > 0;
    const arrived = next.devices.devices.find((device) => device.status === "online" && !known.has(device.id));
    for (const device of next.devices.devices) known.add(device.id);
    if (arrived && hadKnownDevices) {
      setNewDevice(arrived);
      window.setTimeout(() => setNewDevice(null), 8000);
    }
  };

  useEffect(() => {
    seenDevices.current.clear();
    void refresh();
    if (dataMode === "demo") return;

    const events = new EventSource("/events");
    events.addEventListener("snapshot", (event) => {
      updateSnapshot(JSON.parse((event as MessageEvent).data) as DashboardSnapshot);
      setError(null);
    });
    events.onerror = () => {
      setError("Live updates disconnected");
    };
    return () => events.close();
  }, [dataMode]);

  const devices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = snapshot.devices.devices.filter((device) => {
      if (filter !== "all" && device.status !== filter) return false;
      if (!needle) return true;
      return [device.displayName, device.alias, device.vendor, device.hostname, device.ip, device.mac, device.interface]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
    return sort ? [...filtered].sort((a, b) => compareDevices(a, b, sort.key, sort.direction)) : filtered;
  }, [filter, query, snapshot.devices.devices, sort]);
  const wan = snapshot.summary.wan ?? emptySnapshot.summary.wan;
  const healthEntries = Object.entries(snapshot.health.sources);
  const downloadPoints = useMemo(() => ratePoints(snapshot.devices.devices, "rxRateBps"), [snapshot.devices.devices]);
  const uploadPoints = useMemo(() => ratePoints(snapshot.devices.devices, "txRateBps"), [snapshot.devices.devices]);
  const usageBars = useMemo(() => dailyUsageBars(snapshot.devices.devices), [snapshot.devices.devices]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <main className={`shell ${theme}`}>
      <div className="dashboard">
        <header className="topbar">
          <div className="brand">
            <h1>Pi Router Dashboard</h1>
            <p>Raspberry Pi 5 <span>•</span> 192.168.1.1</p>
          </div>
          <div className="top-actions">
            <div className="mode-toggle" role="tablist" aria-label="Data mode">
              {(["live", "demo"] as DataMode[]).map((mode) => (
                <button className={dataMode === mode ? "active" : ""} key={mode} onClick={() => setDataMode(mode)}>
                  {capitalize(mode)}
                </button>
              ))}
            </div>
            <span className="live-chip">
              <span className={error ? "live-dot warning-dot" : "live-dot"} />
              {dataMode === "demo" ? "Demo" : "Live"}
            </span>
            <span className="updated-copy">
              {error ? error : dataMode === "demo" ? "Demo data" : "Updated just now"}
            </span>
            <button className="action-button theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle light and dark mode" aria-label="Toggle light and dark mode">
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="action-button" onClick={() => void refresh()}>
              <RefreshCw size={17} />
              Refresh
            </button>
            <a className="action-button" href="/api/export/devices.csv">
              <FileDown size={17} />
              Export CSV
            </a>
          </div>
        </header>

        {newDevice && (
          <section className="notice">
            <AlertCircle size={17} />
            New device online: <strong>{newDevice.displayName}</strong>
          </section>
        )}

        <section className="metrics" aria-label="Network summary">
          <Metric
            icon={<Users size={30} />}
            label="Online devices"
            value={`${snapshot.summary.onlineDevices}`}
            suffix={`/ ${snapshot.summary.totalDevices}`}
            footer={<ProgressBar value={snapshot.summary.totalDevices ? snapshot.summary.onlineDevices / snapshot.summary.totalDevices : 0} />}
          />
          <Metric icon={<Download size={31} />} label="Download rate" value={formatMbps(snapshot.summary.rxRateBps)} footer={<Sparkline points={downloadPoints} />} />
          <Metric icon={<Upload size={31} />} label="Upload rate" value={formatMbps(snapshot.summary.txRateBps)} footer={<Sparkline points={uploadPoints} />} />
          <Metric
            icon={<PieChart size={31} />}
            label="Today's usage"
            value={`${formatWholeGb(snapshot.summary.rxTodayBytes)}`}
            suffix="GB down"
            footer={<Bars values={usageBars} />}
          />
          <Metric
            icon={<Globe2 size={31} />}
            label={`WAN ${wan.interface}`}
            value={wan.online ? "Online" : "Offline"}
            valueTone={wan.online ? "success" : "danger"}
          />
        </section>

        <section className="summary-band" aria-label="Traffic and service summary">
          <section className="panel top-talkers" aria-label="Top bandwidth users">
            <h2>Top talkers today</h2>
            <div className="talker-list">
              {(snapshot.summary.topTalkers ?? []).length === 0 ? (
                <span className="muted">No traffic sampled yet.</span>
              ) : (
                (snapshot.summary.topTalkers ?? []).slice(0, 4).map((device, index) => (
                  <button key={device.id} onClick={() => setSelected(device)} className="talker-card">
                    <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                    <DeviceGlyph device={device} />
                    <span className="talker-copy">
                      <strong>{device.displayName}</strong>
                      <small>{formatOneDecimalGb(device.rxTodayBytes + device.txTodayBytes)} GB</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="panel services" aria-label="Source health">
            <h2>Services health</h2>
            <div className="service-list">
              {healthEntries.map(([name, source]) => (
                <span className="service-card" title={source.message ?? "OK"} key={name}>
                  <strong>{serviceLabel(name)}</strong>
                  <small className={source.ok ? "ok" : "bad"}>
                    <span className={`dot ${source.ok ? "online" : "offline"}`} />
                    {source.ok ? "Healthy" : "Issue"}
                  </small>
                </span>
              ))}
            </div>
          </section>
        </section>

        <section className="data-panel">
          <section className="toolbar">
            <label className="search">
              <Search size={21} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices..." />
            </label>
            <div className="segments" role="tablist" aria-label="Device filter">
              {(["online", "offline", "all"] as Filter[]).map((item) => (
                <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>
                  {capitalize(item)}
                </button>
              ))}
            </div>
          </section>

          <section className="table-wrap">
            <table>
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column.key} aria-sort={sort?.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                      <button className="sort-button" onClick={() => toggleSort(column.key)}>
                        {column.label}
                        <span className={sort?.key === column.key ? "sort-indicator active" : "sort-indicator"}>{sort?.key === column.key ? (sort.direction === "asc" ? "^" : "v") : "-"}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} onClick={() => setSelected(device)}>
                    <td>
                      <span className={`dot ${device.status}`} />
                      {capitalize(device.status)}
                    </td>
                    <td className="device-cell">
                      <DeviceGlyph device={device} />
                      <span>{device.displayName}</span>
                    </td>
                    <td>{device.vendor ?? "Unknown"}</td>
                    <td>{device.ip ?? "Unknown"}</td>
                    <td className="mono">{device.mac ?? "Unknown"}</td>
                    <td>{formatOneDecimalGb(device.rxTodayBytes)} GB</td>
                    <td>{formatOneDecimalGb(device.txTodayBytes)} GB</td>
                    <td>{formatOneDecimalGb(device.rxTodayBytes + device.txTodayBytes)} GB</td>
                    <td>{formatTime(device.lastSeenAt)}</td>
                    <td>{device.interface ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devices.length === 0 && <div className="empty">No devices match this view.</div>}
          </section>
        </section>
      </div>

      {selected && (
        <DeviceDrawer
          device={selected}
          onClose={() => setSelected(null)}
          onAliasSaved={(next) => {
            updateSnapshot(next);
            setError(null);
          }}
          onError={setError}
          dataMode={dataMode}
          snapshot={snapshot}
        />
      )}

    </main>
  );
}

function Metric({
  label,
  value,
  suffix,
  footer,
  icon,
  valueTone
}: {
  label: string;
  value: string;
  suffix?: string;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  valueTone?: "success" | "danger";
}) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <div className="metric-copy">
        <span className="metric-label">{label}</span>
        <strong className={valueTone ? `metric-value ${valueTone}` : "metric-value"}>
          {value}
          {suffix && <small>{suffix}</small>}
        </strong>
        {footer && <div className="metric-footer">{footer}</div>}
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span className="progress-track" aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </span>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const safePoints = points.length > 1 ? points : [0, 0];
  const max = Math.max(...safePoints);
  const coords = safePoints
    .map((point, index) => `${(index / (safePoints.length - 1)) * 100},${max > 0 ? 26 - (point / max) * 22 : 22}`)
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords} />
    </svg>
  );
}

function Bars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="bars" aria-hidden="true">
      {values.map((value, index) => (
        <span key={index} style={{ height: `${8 + (value / max) * 24}px` }} />
      ))}
    </span>
  );
}

function DeviceGlyph({ device }: { device: Device }) {
  const name = device.displayName.toLowerCase();
  let Icon = Monitor;
  let kind = "monitor";
  if (name.includes("nas") || name.includes("storage")) {
    Icon = Database;
    kind = "storage";
  } else if (name.includes("iphone") || name.includes("phone")) {
    Icon = Smartphone;
    kind = "phone";
  } else if (name.includes("ipad") || name.includes("laptop")) {
    Icon = Laptop;
    kind = "laptop";
  } else if (name.includes("ap") || name.includes("wifi")) {
    Icon = Wifi;
    kind = "wifi";
  } else if (name.includes("speaker")) {
    Icon = Speaker;
    kind = "speaker";
  } else if (name.includes("gateway") || name.includes("router") || name.includes("internet")) {
    Icon = Globe2;
    kind = "gateway";
  } else if (name.includes("pc")) {
    Icon = Server;
    kind = "pc";
  }
  return (
    <span className={`device-glyph ${kind}`} aria-hidden="true">
      <Icon size={22} strokeWidth={1.75} />
    </span>
  );
}

function ratePoints(devices: Device[], key: "rxRateBps" | "txRateBps") {
  const values = devices
    .filter((device) => device.status === "online")
    .map((device) => device[key])
    .filter((value) => Number.isFinite(value) && value >= 0);
  return values.length > 1 ? values : [0, values[0] ?? 0];
}

function dailyUsageBars(devices: Device[]) {
  const values = [...devices]
    .sort((a, b) => b.rxTodayBytes + b.txTodayBytes - (a.rxTodayBytes + a.txTodayBytes))
    .slice(0, 12)
    .map((device) => device.rxTodayBytes + device.txTodayBytes)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return values.length > 0 ? values : [0];
}

function compareDevices(a: Device, b: Device, key: SortKey, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;
  const left = sortValue(a, key);
  const right = sortValue(b, key);
  if (typeof left === "number" && typeof right === "number") return (left - right) * modifier;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * modifier;
}

function sortValue(device: Device, key: SortKey) {
  if (key === "status") return { online: 0, offline: 1, unknown: 2 }[device.status];
  if (key === "device") return device.displayName;
  if (key === "vendor") return device.vendor ?? "";
  if (key === "ip") return device.ip ?? "";
  if (key === "mac") return device.mac ?? "";
  if (key === "down") return device.rxTodayBytes;
  if (key === "up") return device.txTodayBytes;
  if (key === "total") return device.rxTodayBytes + device.txTodayBytes;
  if (key === "lastSeen") return device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : 0;
  return device.interface ?? "";
}

function serviceLabel(name: string) {
  return name === "nftables" ? "nftables" : name === "neighbors" ? "neighbors" : name;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatMbps(bytesPerSecond: number) {
  return `${((bytesPerSecond * 8) / 1_000_000).toFixed(1)} Mbps`;
}

function formatWholeGb(bytes: number) {
  return Math.round(bytes / 1_000_000_000).toString();
}

function formatOneDecimalGb(bytes: number) {
  return (bytes / 1_000_000_000).toFixed(1);
}

function DeviceDrawer({
  device,
  onClose,
  onAliasSaved,
  onError,
  dataMode,
  snapshot
}: {
  device: Device;
  onClose: () => void;
  onAliasSaved: (snapshot: DashboardSnapshot) => void;
  onError: (message: string) => void;
  dataMode: DataMode;
  snapshot: DashboardSnapshot;
}) {
  const [alias, setAlias] = useState(device.alias ?? "");
  const [saving, setSaving] = useState(false);

  const saveAlias = async () => {
    if (!device.mac) return;
    if (device.sources.length === 0) return;
    setSaving(true);
    try {
      onAliasSaved(dataMode === "demo" ? updateDemoAlias(snapshot, device.mac, alias) : await setDeviceAlias(device.mac, alias));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="drawer" aria-label="Device details">
      <div className="drawer-card">
        <button className="square-button close" onClick={onClose} title="Close">
          <X size={18} />
        </button>
        <div className="drawer-title">
          <Activity size={20} />
          <div>
            <h2>{device.displayName}</h2>
            <p>{device.status}</p>
          </div>
        </div>
        <dl>
          <dt>Nickname</dt>
          <dd>
            <div className="alias-editor">
              <input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Add nickname" disabled={!device.mac} />
              <button onClick={() => void saveAlias()} disabled={!device.mac || saving}>
                Save
              </button>
            </div>
          </dd>
          <Detail label="IP address" value={device.ip} />
          <Detail label="MAC address" value={device.mac} mono />
          <Detail label="Vendor" value={device.vendor} />
          <Detail label="Hostname" value={device.hostname} />
          <Detail label="Interface" value={device.interface} />
          <Detail label="Download rate" value={formatRate(device.rxRateBps)} />
          <Detail label="Upload rate" value={formatRate(device.txRateBps)} />
          <Detail label="Downloaded today" value={formatBytes(device.rxTodayBytes)} />
          <Detail label="Uploaded today" value={formatBytes(device.txTodayBytes)} />
          <Detail label="Last seen" value={formatDateTime(device.lastSeenAt)} />
          <Detail label="Lease expires" value={formatDateTime(device.leaseExpiresAt)} />
          <Detail label="Sources" value={device.sources.join(", ")} />
        </dl>
      </div>
    </aside>
  );
}

function Detail({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value || "Unknown"}</dd>
    </>
  );
}
