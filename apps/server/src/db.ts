import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type TrafficSampleInput = {
  ip: string;
  direction: "rx" | "tx";
  rawBytes: number;
  deltaBytes: number;
  sampledAt: Date;
};

export class DashboardDb {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      create table if not exists traffic_samples (
        id integer primary key autoincrement,
        ip text not null,
        direction text not null check(direction in ('rx', 'tx')),
        raw_bytes integer not null,
        delta_bytes integer not null,
        sampled_at text not null
      );
      create index if not exists idx_traffic_samples_today
        on traffic_samples (sampled_at, ip, direction);
      create table if not exists device_aliases (
        mac text primary key,
        alias text not null,
        updated_at text not null
      );
    `);
  }

  insertTrafficSamples(samples: TrafficSampleInput[]): void {
    if (samples.length === 0) return;
    const insert = this.db.prepare(`
      insert into traffic_samples (ip, direction, raw_bytes, delta_bytes, sampled_at)
      values (@ip, @direction, @rawBytes, @deltaBytes, @sampledAt)
    `);
    const tx = this.db.transaction((rows: TrafficSampleInput[]) => {
      for (const row of rows) {
        insert.run({
          ...row,
          sampledAt: row.sampledAt.toISOString()
        });
      }
    });
    tx(samples);
  }

  todayTotals(): Map<string, { rx: number; tx: number }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const rows = this.db
      .prepare(
        `
          select ip, direction, sum(delta_bytes) as total
          from traffic_samples
          where sampled_at >= ?
          group by ip, direction
        `
      )
      .all(start.toISOString()) as Array<{ ip: string; direction: "rx" | "tx"; total: number }>;

    const totals = new Map<string, { rx: number; tx: number }>();
    for (const row of rows) {
      const current = totals.get(row.ip) ?? { rx: 0, tx: 0 };
      current[row.direction] = Number(row.total ?? 0);
      totals.set(row.ip, current);
    }
    return totals;
  }

  health(): boolean {
    this.db.prepare("select 1").get();
    return true;
  }

  aliases(): Map<string, string> {
    const rows = this.db.prepare("select mac, alias from device_aliases").all() as Array<{ mac: string; alias: string }>;
    return new Map(rows.map((row) => [row.mac.toLowerCase(), row.alias]));
  }

  setAlias(mac: string, alias: string): void {
    const normalizedMac = mac.toLowerCase();
    const trimmed = alias.trim();
    if (!trimmed) {
      this.db.prepare("delete from device_aliases where mac = ?").run(normalizedMac);
      return;
    }
    this.db
      .prepare(
        `
          insert into device_aliases (mac, alias, updated_at)
          values (?, ?, ?)
          on conflict(mac) do update set alias = excluded.alias, updated_at = excluded.updated_at
        `
      )
      .run(normalizedMac, trimmed.slice(0, 80), new Date().toISOString());
  }
}
