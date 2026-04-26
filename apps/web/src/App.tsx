import { Activity, AlertCircle, CheckCircle2, Download, FileDown, RefreshCw, Router, Search, Upload, Wifi, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSnapshot, Device } from "@pi-dashboard/shared";
import { fetchSnapshot, setDeviceAlias } from "./api.js";
import { formatBytes, formatDateTime, formatRate, formatTime } from "./format.js";

type Filter = "all" | "online" | "offline";

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
  const [laraPopup, setLaraPopup] = useState(false);
  const seenDevices = useRef(new Set<string>());

  const refresh = async () => {
    try {
      updateSnapshot(await fetchSnapshot());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateSnapshot = (next: DashboardSnapshot) => {
    setSnapshot(next);
    setSelected((current) => (current ? next.devices.devices.find((device) => device.id === current.id) ?? current : null));
    const known = seenDevices.current;
    const arrived = next.devices.devices.find((device) => device.status === "online" && !known.has(device.id));
    for (const device of next.devices.devices) known.add(device.id);
    if (arrived && known.size > 1) {
      setNewDevice(arrived);
      window.setTimeout(() => setNewDevice(null), 8000);
    }
  };

  useEffect(() => {
    void refresh();
    const events = new EventSource("/events");
    events.addEventListener("snapshot", (event) => {
      updateSnapshot(JSON.parse((event as MessageEvent).data) as DashboardSnapshot);
      setError(null);
    });
    events.onerror = () => {
      setError("Live updates disconnected");
    };
    return () => events.close();
  }, []);

  const devices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.devices.devices.filter((device) => {
      if (filter !== "all" && device.status !== filter) return false;
      if (!needle) return true;
      return [device.displayName, device.alias, device.vendor, device.hostname, device.ip, device.mac, device.interface]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [filter, query, snapshot.devices.devices]);
  const wan = snapshot.summary.wan ?? emptySnapshot.summary.wan;

  const maybeShowLaraPopup = () => {
    if (!laraPopup && Math.random() < 0.1) {
      setLaraPopup(true);
    }
  };

  return (
    <main className="shell" onClickCapture={maybeShowLaraPopup}>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            <Router size={16} />
            Pi Router
          </div>
          <h1>Network devices</h1>
        </div>
        <div className="top-actions">
          <span className={error ? "status-pill warning" : "status-pill"}>
            {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {error ?? `Updated ${formatTime(snapshot.devices.capturedAt)}`}
          </span>
          <button className="icon-button" onClick={() => void refresh()} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <a className="icon-button" href="/api/export/devices.csv" title="Export CSV">
            <FileDown size={18} />
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
        <Metric label="Online devices" value={`${snapshot.summary.onlineDevices}/${snapshot.summary.totalDevices}`} />
        <Metric icon={<Download size={18} />} label="Download" value={formatRate(snapshot.summary.rxRateBps)} />
        <Metric icon={<Upload size={18} />} label="Upload" value={formatRate(snapshot.summary.txRateBps)} />
        <Metric label="Today" value={`${formatBytes(snapshot.summary.rxTodayBytes)} down`} sub={`${formatBytes(snapshot.summary.txTodayBytes)} up`} />
        <Metric
          icon={<Wifi size={18} />}
          label={`WAN ${wan.interface}`}
          value={wan.online ? "Online" : "Offline"}
          sub={wan.addresses[0] ?? wan.message ?? "No IPv4 address"}
        />
      </section>

      <section className="top-talkers" aria-label="Top bandwidth users">
        <div>
          <h2>Top talkers today</h2>
          <p>Ranked by total upload and download since midnight.</p>
        </div>
        <div className="talker-list">
          {(snapshot.summary.topTalkers ?? []).length === 0 ? (
            <span className="muted">No traffic sampled yet.</span>
          ) : (
            (snapshot.summary.topTalkers ?? []).map((device) => (
              <button key={device.id} onClick={() => setSelected(device)}>
                <span>{device.displayName}</span>
                <strong>{formatBytes(device.rxTodayBytes + device.txTodayBytes)}</strong>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="health" aria-label="Source health">
        {Object.entries(snapshot.health.sources).map(([name, source]) => (
          <span className={source.ok ? "health-pill ok" : "health-pill bad"} title={source.message ?? "OK"} key={name}>
            {source.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {name}
          </span>
        ))}
      </section>

      <section className="toolbar">
        <label className="search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, IP, MAC, interface" />
        </label>
        <div className="segments" role="tablist" aria-label="Device filter">
          {(["online", "offline", "all"] as Filter[]).map((item) => (
            <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Device</th>
              <th>Vendor</th>
              <th>IP</th>
              <th>MAC</th>
              <th>Down</th>
              <th>Up</th>
              <th>Total today</th>
              <th>Last seen</th>
              <th>Interface</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} onClick={() => setSelected(device)}>
                <td>
                  <span className={`dot ${device.status}`} />
                  {device.status}
                </td>
                <td className="strong">{device.displayName}</td>
                <td>{device.vendor ?? "Unknown"}</td>
                <td>{device.ip ?? "Unknown"}</td>
                <td className="mono">{device.mac ?? "Unknown"}</td>
                <td>{formatRate(device.rxRateBps)}</td>
                <td>{formatRate(device.txRateBps)}</td>
                <td>{formatBytes(device.rxTodayBytes + device.txTodayBytes)}</td>
                <td>{formatTime(device.lastSeenAt)}</td>
                <td>{device.interface ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {devices.length === 0 && <div className="empty">No devices match this view.</div>}
      </section>

      {selected && (
        <DeviceDrawer
          device={selected}
          onClose={() => setSelected(null)}
          onAliasSaved={(next) => {
            updateSnapshot(next);
            setError(null);
          }}
          onError={setError}
        />
      )}

      {laraPopup && (
        <div className="surprise-backdrop" role="dialog" aria-modal="true" aria-label="Surprise message" onClick={() => setLaraPopup(false)}>
          <div className="surprise-popup" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button surprise-close" onClick={() => setLaraPopup(false)} title="Close">
              <X size={18} />
            </button>
            <strong>Lara is die beste vrou ooit!!!</strong>
            <small>*Lara het my dit laat doen</small>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="metric">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function DeviceDrawer({
  device,
  onClose,
  onAliasSaved,
  onError
}: {
  device: Device;
  onClose: () => void;
  onAliasSaved: (snapshot: DashboardSnapshot) => void;
  onError: (message: string) => void;
}) {
  const [alias, setAlias] = useState(device.alias ?? "");
  const [saving, setSaving] = useState(false);

  const saveAlias = async () => {
    if (!device.mac) return;
    if (device.sources.length === 0) return;
    setSaving(true);
    try {
      onAliasSaved(await setDeviceAlias(device.mac, alias));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="drawer" aria-label="Device details">
      <div className="drawer-card">
        <button className="icon-button close" onClick={onClose} title="Close">
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
