import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import type { AliasRequest } from "@pi-dashboard/shared";
import { loadConfig } from "./config.js";
import { Collector } from "./collector.js";
import { DashboardDb } from "./db.js";

dotenv.config();

const config = loadConfig();
const server = Fastify({ logger: true });
const db = new DashboardDb(config.databasePath);
const collector = new Collector(config, db);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(dirname, "../../web/dist");

server.get("/api/devices", async () => collector.snapshot().devices);
server.get("/api/summary", async () => collector.snapshot().summary);
server.get("/api/health", async () => collector.snapshot().health);
server.get("/api/export/devices.csv", async (_request, reply) => {
  reply.header("content-type", "text/csv; charset=utf-8");
  reply.header("content-disposition", `attachment; filename="pi-dashboard-devices.csv"`);
  return collector.csv();
});

server.put<{ Params: { mac: string }; Body: AliasRequest }>("/api/devices/:mac/alias", async (request) => {
  return collector.setAlias(request.params.mac, request.body.alias);
});

server.get("/events", async (request, reply) => {
  reply.raw.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });

  const send = (payload: unknown) => {
    reply.raw.write(`event: snapshot\n`);
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = collector.onSnapshot(send);
  request.raw.on("close", unsubscribe);
});

await server.register(fastifyStatic, {
  root: process.env.WEB_DIST_PATH ?? staticRoot,
  prefix: "/"
});

server.setNotFoundHandler(async (_request, reply) => {
  return reply.sendFile("index.html");
});

const shutdown = async () => {
  collector.stop();
  await server.close();
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

collector.start();
await server.listen({ host: config.host, port: config.port });
