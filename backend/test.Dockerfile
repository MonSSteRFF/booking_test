FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
ENV CI=true
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec tsc --noEmit

CMD ["pnpm", "test"]
