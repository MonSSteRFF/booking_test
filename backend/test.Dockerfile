FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx tsc --noEmit

CMD ["npm", "test"]
