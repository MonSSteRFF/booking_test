FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml front/admin/package.json front/admin/ ./
RUN pnpm install --frozen-lockfile
COPY front/admin/ ./
EXPOSE 5173