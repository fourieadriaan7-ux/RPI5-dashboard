import { describe, expect, it } from "vitest";
import { parseDnsmasqLeases } from "../src/parsers/dnsmasq.js";
import { parseNeighbors } from "../src/parsers/neigh.js";
import { parseNftSetCounters } from "../src/parsers/nft.js";
import { calculateRateBps } from "../src/utils/rates.js";

describe("parseDnsmasqLeases", () => {
  it("parses leases and ignores wildcard hostnames", () => {
    const leases = parseDnsmasqLeases(
      "1893456000 aa:bb:cc:dd:ee:ff 192.168.1.10 phone 01:aa\n1893456000 11:22:33:44:55:66 192.168.1.11 * *",
      new Date("2026-01-01T00:00:00Z")
    );

    expect(leases).toEqual([
      {
        expiresAt: new Date(1893456000 * 1000),
        mac: "aa:bb:cc:dd:ee:ff",
        ip: "192.168.1.10",
        hostname: "phone",
        clientId: "01:aa"
      },
      {
        expiresAt: new Date(1893456000 * 1000),
        mac: "11:22:33:44:55:66",
        ip: "192.168.1.11",
        hostname: undefined,
        clientId: undefined
      }
    ]);
  });

  it("drops expired leases", () => {
    const leases = parseDnsmasqLeases("1 aa:bb:cc:dd:ee:ff 192.168.1.10 old *", new Date("2026-01-01T00:00:00Z"));
    expect(leases).toHaveLength(0);
  });
});

describe("parseNeighbors", () => {
  it("parses active neighbor entries and filters failed entries", () => {
    const neighbors = parseNeighbors(
      JSON.stringify([
        { dst: "192.168.1.10", dev: "eth1", lladdr: "AA:BB:CC:DD:EE:FF", state: ["REACHABLE"] },
        { dst: "192.168.1.99", dev: "eth1", state: ["FAILED"] }
      ])
    );

    expect(neighbors).toEqual([
      { ip: "192.168.1.10", dev: "eth1", mac: "aa:bb:cc:dd:ee:ff", state: "REACHABLE" }
    ]);
  });
});

describe("parseNftSetCounters", () => {
  it("parses nft set element counters", () => {
    const counters = parseNftSetCounters(
      JSON.stringify({
        nftables: [
          { metainfo: { version: "1.0.9" } },
          {
            set: {
              elem: [
                { elem: { val: "192.168.1.10", counter: { packets: 12, bytes: 4096 } } },
                { elem: { val: "192.168.1.11", counter: { packets: 1, bytes: 64 } } }
              ]
            }
          }
        ]
      })
    );

    expect(counters).toEqual([
      { ip: "192.168.1.10", packets: 12, bytes: 4096 },
      { ip: "192.168.1.11", packets: 1, bytes: 64 }
    ]);
  });
});

describe("calculateRateBps", () => {
  it("calculates bytes per second from counter deltas", () => {
    expect(calculateRateBps({ bytes: 1000, sampledAt: 1000 }, { bytes: 3000, sampledAt: 3000 })).toBe(1000);
  });

  it("returns zero on counter reset", () => {
    expect(calculateRateBps({ bytes: 3000, sampledAt: 1000 }, { bytes: 1000, sampledAt: 3000 })).toBe(0);
  });
});
