FROM node:24-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared

ENV NODE_ENV=production
USER node
CMD ["node", "--import", "tsx", "server/index.ts"]
