import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { parseDnsmasqLeases } from "./parsers/dnsmasq.js";
import { parseNeighbors } from "./parsers/neigh.js";
import { parseNftSetCounters } from "./parsers/nft.js";

const execFileAsync = promisify(execFile);

export const readLeases = async (leaseFile: string) =>
  parseDnsmasqLeases(await fs.readFile(leaseFile, "utf8"));

export const readNeighbors = async () => {
  const { stdout } = await execFileAsync("ip", ["-j", "neigh"], { timeout: 5000 });
  return parseNeighbors(stdout);
};

export const readNftCounters = async (setName: "upload4" | "download4") => {
  const { stdout } = await execFileAsync("nft", ["-j", "list", "set", "inet", "pi_dashboard_bw", setName], {
    timeout: 5000
  });
  return parseNftSetCounters(stdout);
};

type RawAddress = {
  ifname?: string;
  operstate?: string;
  addr_info?: Array<{ family?: string; local?: string }>;
};

export const readInterfaceStatus = async (interfaceName: string) => {
  const [{ stdout }, rxBytes, txBytes] = await Promise.all([
    execFileAsync("ip", ["-j", "addr", "show", "dev", interfaceName], { timeout: 5000 }),
    fs.readFile(`/sys/class/net/${interfaceName}/statistics/rx_bytes`, "utf8"),
    fs.readFile(`/sys/class/net/${interfaceName}/statistics/tx_bytes`, "utf8")
  ]);

  const parsed = JSON.parse(stdout) as RawAddress[];
  const iface = parsed[0];
  return {
    interface: interfaceName,
    online: iface?.operstate === "UP",
    addresses: iface?.addr_info?.filter((addr) => addr.family === "inet").map((addr) => addr.local ?? "").filter(Boolean) ?? [],
    rxBytes: Number(rxBytes.trim()),
    txBytes: Number(txBytes.trim())
  };
};
