# Back-SW2 — Cardly backend (Express 5 + Prisma 6 + JWT)
FROM node:24-alpine

WORKDIR /app

# Prisma necesita openssl para su motor de queries en Alpine.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
