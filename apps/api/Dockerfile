FROM node:20-slim AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy API package + prisma schema
COPY apps/api/package.json apps/api/
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @voxaid/api

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Copy API source and build
COPY apps/api/ ./
RUN pnpm build

# Production
FROM node:20-slim
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/package.json ./

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/src/main.js"]
