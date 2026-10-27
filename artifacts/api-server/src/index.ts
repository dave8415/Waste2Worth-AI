import app from "./app";
import { loadRootEnv } from "./lib/load-root-env";
import { logger } from "./lib/logger";

loadRootEnv();

const rawPort = process.env.PORT || "8080";

const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info(
    {
      port,
      geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    },
    "Server listening",
  );
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

// Cloud Run sends SIGTERM before stopping an instance.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 9_000).unref();
});
