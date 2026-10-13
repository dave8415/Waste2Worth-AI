# Cloud Run requires linux/amd64; use --platform=linux/amd64 when building locally.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Match the workspace's package manager. Never pass secrets as build arguments.
RUN npm install --global pnpm@10.26.1
COPY . .
RUN pnpm install --frozen-lockfile
RUN PORT=8080 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/waste2worth-ai run build \
    && NODE_ENV=production pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# The API build bundles its dependencies and logging workers into dist.
# Only compiled application files enter the runtime image.
COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build --chown=node:node /app/artifacts/waste2worth-ai/dist/public ./artifacts/waste2worth-ai/dist/public

USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
