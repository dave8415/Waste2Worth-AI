import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findWorkspaceRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function parseEnvFile(contents: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return entries;
}

/**
 * Loads repository-root `.env` into process.env without overriding values
 * already provided by the host (Replit, Cloud Run, or the current shell).
 * No-op in the Cloud Run image, which does not include the workspace file.
 */
export function loadRootEnv(): void {
  const workspaceRoot = findWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url)));
  if (!workspaceRoot) {
    return;
  }

  const envPath = path.join(workspaceRoot, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const [key, value] of parseEnvFile(readFileSync(envPath, "utf8"))) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
