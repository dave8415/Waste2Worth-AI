import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [];
let shuttingDown = false;
let exitCode = 0;

function run(label, args, extraEnv) {
  const child = spawn("pnpm", args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    exitCode = code === 0 || code == null ? exitCode : code;
    console.error(
      `[dev] ${label} exited${signal ? ` (${signal})` : ` with code ${code ?? 0}`}. Stopping the other process.`,
    );
    shutdown(exitCode || 1);
  });

  children.push(child);
}

function shutdown(code) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  exitCode = code;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 5_000).unref();

  const remaining = children.filter((child) => child.exitCode == null && child.signalCode == null);
  if (remaining.length === 0) {
    process.exit(exitCode);
  }

  for (const child of remaining) {
    child.once("exit", () => {
      if (children.every((item) => item.exitCode != null || item.signalCode != null)) {
        process.exit(exitCode);
      }
    });
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", ["--filter", "@workspace/api-server", "run", "dev"], {
  NODE_ENV: "development",
  PORT: "8080",
});

run("frontend", ["--filter", "@workspace/waste2worth-ai", "run", "dev"], {
  NODE_ENV: "development",
  PORT: "5173",
  BASE_PATH: "/",
});
