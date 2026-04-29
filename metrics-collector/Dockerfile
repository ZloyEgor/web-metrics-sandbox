# syntax=docker/dockerfile:1.7

FROM node:20-slim AS base

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    CHROME_PATH=/usr/bin/chromium \
    PORT=4000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
        dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
