FROM node:20-alpine AS builder

WORKDIR /app/backend

COPY package*.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cafe_reservation \
    npx prisma generate \
    && npm run build \
    && cp src/generated/prisma/*.node dist/generated/prisma/

FROM node:20-alpine AS production

WORKDIR /app/backend

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev \
    && npm install prisma@6.19.0 tsx@4.20.6 --no-save \
    && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/src/generated ./src/generated
COPY prisma.config.ts ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
