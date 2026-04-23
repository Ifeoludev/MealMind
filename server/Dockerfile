# ── Stage 1: Builder ────────────────────────────────────────────────────────
# Start from the official Node 20 image on Alpine Linux (tiny ~5MB Linux distro)
# "AS builder" names this stage so Stage 2 can reference it
FROM node:20-alpine AS builder

# Set the working directory inside the container — all commands run from here
WORKDIR /app

# Copy package.json and package-lock.json BEFORE copying source code.
# Docker builds in layers and caches each one. If these files haven't changed,
# Docker reuses the cached npm ci layer and skips reinstalling 300+ packages.
# This makes rebuilds after code-only changes much faster.
COPY package*.json ./

# Install ALL dependencies (including devDependencies — we need TypeScript here)
# npm ci = clean install, uses exact versions from package-lock.json, no surprises
RUN npm ci

# Copy Prisma config and schema so we can generate the Prisma client
COPY prisma.config.ts ./
COPY prisma ./prisma

# Generate the Prisma client — this produces the type-safe DB query code
# inside src/generated/prisma. It must run inside the container because the
# generated output is platform-specific (different binaries for Linux vs Windows)
RUN npx prisma generate

# Now copy the rest of the source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript → JavaScript into /app/dist
RUN npm run build


# ── Stage 2: Production ─────────────────────────────────────────────────────
# Fresh start — everything from Stage 1 is gone. Only what we explicitly copy
# makes it into the final image. This is why the image stays small.
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

# --omit=dev skips devDependencies — no TypeScript, no ts-node, no nodemon
# The final image only contains what the running app actually needs
RUN npm ci --omit=dev

# Pull the compiled JavaScript from the builder stage
# --from=builder tells Docker to grab files from Stage 1, not the current stage
COPY --from=builder /app/dist ./dist

# Pull the generated Prisma client from the builder stage into dist/generated
# because dist/config/db.js resolves "../generated/prisma/client" → dist/generated/prisma/client
COPY --from=builder /app/src/generated ./dist/generated

# Copy Prisma schema and migrations — needed by prisma migrate deploy at startup
COPY prisma.config.ts ./
COPY prisma ./prisma

# Document that the app listens on port 3001 (informational — does not open the port)
EXPOSE 3001

# The command that runs when a container starts:
# 1. prisma migrate deploy — applies any pending migrations to the database
# 2. node dist/app.js — starts the compiled Express server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
