# syntax=docker/dockerfile:1

# Builds the NestJS API (services/api) out of the pnpm monorepo.
# Build context MUST be the repo root: the API depends on the @repo/types
# workspace package, and pnpm needs the lockfile + workspace manifests.

############################################################
# Base — Node + pnpm + openssl (Debian, for Prisma engine)
############################################################
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# openssl + CA certs: required by Prisma's query engine and for TLS to
# managed Postgres. Debian (glibc) avoids the musl/Alpine Prisma headaches.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

############################################################
# Build — install the `api` closure, build deps + api, gen client
############################################################
FROM base AS build
# Copy the whole monorepo (trimmed by .dockerignore). All workspace
# package.json manifests must be present to validate the frozen lockfile.
COPY . .
# Install ONLY the `api` package and its workspace dependencies (@repo/types).
# The trailing `...` pulls in dependencies; this skips the React Native / Expo
# apps and their native postinstall scripts entirely.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter=api...
# Build the shared types package, generate the Prisma client, then compile the API.
RUN pnpm --filter=@repo/types run build \
    && pnpm --filter=api run prisma:generate \
    && pnpm --filter=api run build
# Produce a self-contained, production-only bundle for `api` at /app
# (outside the workspace, as pnpm deploy requires).
RUN pnpm --filter=api deploy --prod /app
# Regenerate the Prisma client inside the pruned bundle so the engine/artifacts
# are guaranteed present in the final node_modules.
RUN cd /app && node_modules/.bin/prisma generate

############################################################
# Runtime — minimal image that runs the compiled server
############################################################
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "dist/main.js"]
