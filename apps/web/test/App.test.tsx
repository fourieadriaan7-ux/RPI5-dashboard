import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";

class MockEventSource {
  onerror: (() => void) | null = null;
  constructor(public url: string) {}
  addEventListener = vi.fn();
  close = vi.fn();
}

vi.stubGlobal("EventSource", MockEventSource);

afterEach(() => {
  cleanup();
});

describe("App", () => {
  it("renders empty router dashboard without overflowing copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payloads: Record<string, unknown> = {
          "/api/devices": { capturedAt: new Date().toISOString(), refreshAfterMs: 1000, devices: [] },
          "/api/summary": {
            capturedAt: new Date().toISOString(),
            onlineDevices: 0,
            totalDevices: 0,
            rxRateBps: 0,
            txRateBps: 0,
            rxTodayBytes: 0,
            txTodayBytes: 0,
            topTalkers: [],
            wan: {
              interface: "eth0",
              online: false,
              addresses: [],
              message: "offline in test"
            }
          },
          "/api/health": {
            capturedAt: new Date().toISOString(),
            sources: {
              dnsmasq: { ok: true, checkedAt: new Date().toISOString() },
              neighbors: { ok: true, checkedAt: new Date().toISOString() },
              nftables: { ok: false, checkedAt: new Date().toISOString(), message: "missing table" },
              sqlite: { ok: true, checkedAt: new Date().toISOString() }
            }
          }
        };
        return { ok: true, json: async () => payloads[url] } as Response;
      })
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Pi Router Dashboard" })).toBeInTheDocument();
    expect(await screen.findByText("No devices match this view.")).toBeInTheDocument();
  });

  it("switches to demo data from the dashboard toggle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payloads: Record<string, unknown> = {
          "/api/devices": { capturedAt: new Date().toISOString(), refreshAfterMs: 1000, devices: [] },
          "/api/summary": {
            capturedAt: new Date().toISOString(),
            onlineDevices: 0,
            totalDevices: 0,
            rxRateBps: 0,
            txRateBps: 0,
            rxTodayBytes: 0,
            txTodayBytes: 0,
            topTalkers: [],
            wan: {
              interface: "eth0",
              online: false,
              addresses: [],
              message: "offline in test"
            }
          },
          "/api/health": {
            capturedAt: new Date().toISOString(),
            sources: {
              dnsmasq: { ok: true, checkedAt: new Date().toISOString() },
              neighbors: { ok: true, checkedAt: new Date().toISOString() },
              nftables: { ok: false, checkedAt: new Date().toISOString(), message: "missing table" },
              sqlite: { ok: true, checkedAt: new Date().toISOString() }
            }
          }
        };
        return { ok: true, json: async () => payloads[url] } as Response;
      })
    );

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Demo" }));

    expect((await screen.findAllByText("Living Room TV")).length).toBeGreaterThan(0);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });

  it("sorts demo devices from table headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const payloads: Record<string, unknown> = {
          "/api/devices": { capturedAt: new Date().toISOString(), refreshAfterMs: 1000, devices: [] },
          "/api/summary": {
            capturedAt: new Date().toISOString(),
            onlineDevices: 0,
            totalDevices: 0,
            rxRateBps: 0,
            txRateBps: 0,
            rxTodayBytes: 0,
            txTodayBytes: 0,
            topTalkers: [],
            wan: {
              interface: "eth0",
              online: false,
              addresses: [],
              message: "offline in test"
            }
          },
          "/api/health": {
            capturedAt: new Date().toISOString(),
            sources: {
              dnsmasq: { ok: true, checkedAt: new Date().toISOString() },
              neighbors: { ok: true, checkedAt: new Date().toISOString() },
              nftables: { ok: false, checkedAt: new Date().toISOString(), message: "missing table" },
              sqlite: { ok: true, checkedAt: new Date().toISOString() }
            }
          }
        };
        return { ok: true, json: async () => payloads[url] } as Response;
      })
    );

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Demo" }));
    await userEvent.click(await screen.findByRole("button", { name: "IP -" }));

    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Internet Gateway");
  });
});
