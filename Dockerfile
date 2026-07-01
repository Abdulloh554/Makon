FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc && npx tsc-alias

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

RUN mkdir -p /app/uploads && chown -R nodeuser:nodejs /app/uploads

USER nodeuser

EXPOSE 4000

ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
