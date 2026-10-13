import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "9mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  // Keep API requests out of the SPA fallback, including unknown API routes.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  // This relative layout is identical in the workspace and the runtime image.
  const frontendDirectory = fileURLToPath(
    new URL("../../waste2worth-ai/dist/public/", import.meta.url),
  );
  const frontendIndex = path.join(frontendDirectory, "index.html");
  if (!existsSync(frontendIndex)) {
    throw new Error("Production frontend is missing. Build Waste2Worth AI before starting the server.");
  }

  app.use("/assets", express.static(path.join(frontendDirectory, "assets"), {
    immutable: true,
    maxAge: "1y",
  }));
  app.use(express.static(frontendDirectory, { index: false }));
  app.use((req, res, next) => {
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      !path.extname(req.path) &&
      req.accepts("html")
    ) {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(frontendIndex);
      return;
    }
    next();
  });
}

export default app;
