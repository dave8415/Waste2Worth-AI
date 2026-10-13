---
name: Workspace release tooling
description: Non-obvious Git write protection and container verification constraints in this workspace.
---

### Authorized Git writes

The workspace Git guard rejects index writes unless the command has the `DANGEROUSLY_ALLOW_GIT=1` prefix. Use this only for specific commits/pushes that the user has authorized, not as permission to reset history or force-push.

**Why:** An explicitly requested deployment commit initially failed on the protected Git index; the prefixed commit succeeded.

**How to apply:** Stage only the relevant files and preserve unrelated work. A configured public GitHub remote and successful reads do not prove push authentication is valid; reconnect through Replit's Git Providers settings if GitHub rejects the saved credential.

### Container checks

Docker builds and published HTTP requests worked here, but `docker exec` failed with an OCI namespace/setns error.

**Why:** An exec failure occurred after the running container had already passed HTTP route checks.

**How to apply:** Do not diagnose startup failure from exec alone. Verify the mapped HTTP endpoint, configured internal port, and safe startup logs. Use an automatically assigned host port when existing workflows occupy fixed ports.
