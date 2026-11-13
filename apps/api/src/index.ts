import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`[api] listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  if (env.apiDocsEnabled) {
    console.log(`[api] docs: http://0.0.0.0:${env.PORT}/api/docs`);
  }
});

// Expired sessions are ignored at read time; prune them periodically so the
// table does not grow without bound.
function pruneExpiredSessions() {
  prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((error: unknown) => console.error("[api] session cleanup failed:", error));
}
pruneExpiredSessions();
setInterval(pruneExpiredSessions, 24 * 60 * 60 * 1000).unref();

async function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
