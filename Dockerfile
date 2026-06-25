FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
COPY shared/ ./shared/
RUN npx tsc && npx tsc-alias

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./

RUN mkdir -p /app/uploads && chown -R nodeuser:nodejs /app/uploads

USER nodeuser

EXPOSE 4000

ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/src/server.js"]
