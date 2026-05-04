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
              pihole: { ok: false, checkedAt: new Date().toISOString(), message: "missing database" },
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
              pihole: { ok: false, checkedAt: new Date().toISOString(), message: "missing database" },
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
              pihole: { ok: false, checkedAt: new Date().toISOString(), message: "missing database" },
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

  it("saves a selected device icon in the drawer", async () => {
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
              pihole: { ok: false, checkedAt: new Date().toISOString(), message: "missing database" },
              sqlite: { ok: true, checkedAt: new Date().toISOString() }
            }
          }
        };
        return { ok: true, json: async () => payloads[url] } as Response;
      })
    );

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Demo" }));
    const tvRow = (await screen.findAllByRole("row")).find((row) => row.textContent?.includes("Living Room TV"));
    expect(tvRow).toBeDefined();
    await userEvent.click(tvRow!);
    await userEvent.clear(screen.getByPlaceholderText("Add nickname"));
    await userEvent.type(screen.getByPlaceholderText("Add nickname"), "Cinema TV");
    expect(screen.queryByRole("radio", { name: "Game" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Change icon" }));
    expect(screen.getByRole("radio", { name: "Robot vacuum" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Game" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("complementary", { name: "Device details" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Device settings saved");
    expect(screen.getByRole("status")).toHaveTextContent("Cinema TV");
    expect(screen.getByRole("status")).toHaveTextContent("Nickname: Cinema TV");
    expect(screen.getByRole("status")).toHaveTextContent("Icon: Game");
  });

  it("opens a Pi-hole log popup from the device table", async () => {
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
              pihole: { ok: false, checkedAt: new Date().toISOString(), message: "missing database" },
              sqlite: { ok: true, checkedAt: new Date().toISOString() }
            }
          }
        };
        return { ok: true, json: async () => payloads[url] } as Response;
      })
    );

    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Demo" }));
    await userEvent.click(screen.getByRole("button", { name: "Show Pi-hole logs for Living Room TV" }));

    expect(screen.getByRole("dialog", { name: "Pi-hole log" })).toHaveTextContent("Living Room TV");
    expect(screen.getByRole("dialog", { name: "Pi-hole log" })).toHaveTextContent("184");
    expect(screen.getByRole("dialog", { name: "Pi-hole log" })).toHaveTextContent("netflix.com");
    expect(screen.getByRole("dialog", { name: "Pi-hole log" })).toHaveTextContent("ads.samsungads.com");
    expect(screen.getByRole("dialog", { name: "Pi-hole log" })).toHaveTextContent("Blocked");
    expect(screen.queryByRole("complementary", { name: "Device details" })).not.toBeInTheDocument();
  });
});
