FROM node:24-slim AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy API package
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @voxaid/api

# Copy API source
COPY apps/api/ apps/api/

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Production
FROM node:24-slim
WORKDIR /app
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json ./

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/main.js"]
