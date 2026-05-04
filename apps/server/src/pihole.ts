import fs from "node:fs";
import Database from "better-sqlite3";
import type { DeviceDnsStats } from "@pi-dashboard/shared";

const blockedStatuses = new Set([1, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 18]);

type QuerySummaryRow = {
  client: string;
  total: number;
  blocked: number;
  lastTimestamp: number | null;
};

type RecentQueryRow = {
  client: string;
  domain: string;
  timestamp: number;
  type: number | null;
  status: number;
};

export const readPiHoleStats = (databasePath: string, now = new Date()): Map<string, DeviceDnsStats> => {
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Pi-hole database not found at ${databasePath}`);
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startSeconds = Math.floor(start.getTime() / 1000);
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    const summaries = db
      .prepare(
        `
          select
            client,
            count(*) as total,
            sum(case when status in (${[...blockedStatuses].map(() => "?").join(",")}) then 1 else 0 end) as blocked,
            max(timestamp) as lastTimestamp
          from queries
          where timestamp >= ?
          group by client
        `
      )
      .all(...blockedStatuses, startSeconds) as QuerySummaryRow[];

    const recent = db
      .prepare(
        `
          select client, domain, timestamp, type, status
          from queries
          where timestamp >= ?
          order by timestamp desc
          limit 1000
        `
      )
      .all(startSeconds) as RecentQueryRow[];

    const stats = new Map<string, DeviceDnsStats>();
    for (const row of summaries) {
      stats.set(row.client, {
        queriesToday: Number(row.total ?? 0),
        blockedToday: Number(row.blocked ?? 0),
        lastQueryAt: row.lastTimestamp ? new Date(row.lastTimestamp * 1000).toISOString() : undefined,
        recentDomains: [],
        recentQueries: []
      });
    }

    for (const row of recent) {
      const current = stats.get(row.client);
      if (!current) continue;
      if (current.recentDomains.includes(row.domain)) continue;
      if (current.recentDomains.length >= 5) continue;
      current.recentDomains.push(row.domain);
    }

    for (const row of recent) {
      const current = stats.get(row.client);
      if (!current) continue;
      if (current.recentQueries.length >= 25) continue;
      current.recentQueries.push({
        queriedAt: new Date(row.timestamp * 1000).toISOString(),
        domain: row.domain,
        type: queryTypeLabel(row.type),
        result: blockedStatuses.has(row.status) ? "blocked" : "allowed"
      });
    }

    return stats;
  } finally {
    db.close();
  }
};

const queryTypeLabel = (type: number | null): string => {
  if (type === 1) return "A";
  if (type === 2) return "AAAA";
  if (type === 3) return "ANY";
  if (type === 4) return "SRV";
  if (type === 5) return "SOA";
  if (type === 6) return "PTR";
  if (type === 7) return "TXT";
  if (type === 8) return "NAPTR";
  if (type === 9) return "MX";
  if (type === 10) return "DS";
  if (type === 11) return "RRSIG";
  if (type === 12) return "DNSKEY";
  if (type === 13) return "NS";
  return "Other";
};
