FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml backend/package.json backend/ ./
RUN pnpm install --frozen-lockfile
COPY backend/ ./
EXPOSE 3000