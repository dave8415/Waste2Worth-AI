/**
 * Vite `base` must be "/" locally and in the default production build.
 * Git Bash converts a shell `BASE_PATH=/` into the Git for Windows prefix
 * (for example `C:/Program Files/Git/`), which Vite rejects.
 */
export function resolveViteBase(raw?: string): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "/";

  const posix = value.replace(/\\/g, "/");
  const msysGit = posix.match(/^[A-Za-z]:\/(?:[^/]+\/)*Git(?:\/(.*))?$/i);
  if (msysGit) {
    const rest = (msysGit[1] || "").replace(/^\/+|\/+$/g, "");
    return rest ? `/${rest}` : "/";
  }

  if (/^https?:\/\//i.test(posix) || posix.startsWith("/")) {
    return posix;
  }

  return `/${posix}`;
}
