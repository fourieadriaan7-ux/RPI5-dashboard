import type { DashboardSnapshot, DeviceListResponse, HealthResponse, SummaryResponse } from "@pi-dashboard/shared";

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
};

export const fetchSnapshot = async (): Promise<DashboardSnapshot> => {
  const [devices, summary, health] = await Promise.all([
    getJson<DeviceListResponse>("/api/devices"),
    getJson<SummaryResponse>("/api/summary"),
    getJson<HealthResponse>("/api/health")
  ]);
  return { devices, summary, health };
};

export const setDeviceAlias = async (mac: string, alias: string): Promise<DashboardSnapshot> => {
  const response = await fetch(`/api/devices/${encodeURIComponent(mac)}/alias`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ alias })
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<DashboardSnapshot>;
};
