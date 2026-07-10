FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
