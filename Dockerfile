# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: install deps + build. `next build` with `output: "standalone"`
# (next.config.ts) produces a self-contained `.next/standalone` tree with
# only the node_modules the server actually needs traced in -- the final
# image never needs a full `npm install`.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# WARDEN_API_ORIGIN must NOT be set here -- same-origin-in-production is
# the whole point (see next.config.ts's doc comment / ARCHITECTURE.md §2),
# and baking a build-time origin in would defeat that.
# --webpack: Next 16 defaults `next build` to Turbopack, which has no
# native binary for musl (this image's libc) and only loads WASM bindings
# it then refuses to build with -- confirmed failing outright on
# node:22-alpine. Webpack has no such platform restriction.
RUN npm run build -- --webpack

# ---------------------------------------------------------------------------
# Final image: just the standalone server + static assets, no source, no
# dev dependencies, no package manager.
# ---------------------------------------------------------------------------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# The standalone server.js resolves its own hostname (via HOSTNAME, or the
# OS hostname if unset) and binds *that* address specifically -- inside a
# container, the OS hostname is the container id, which Docker's own
# /etc/hosts maps to the container's actual bridge IP, not the wildcard
# address. Without this, the server binds narrowly to e.g. 172.17.0.2:3000
# instead of 0.0.0.0:3000, and nothing outside the container's own network
# namespace (not even another container on the same compose network, like
# Traefik) can reach it, despite `docker ps`/logs showing everything as
# healthy and "Ready" (confirmed the hard way -- reachable neither via a
# published host port nor via a direct connection to the container's own
# bridge IP, only fixed once HOSTNAME was forced explicitly).
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
