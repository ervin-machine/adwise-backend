# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim

LABEL fly_launch_runtime="NodeJS"

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies first so this layer is only invalidated when
# package.json/package-lock.json actually change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=5000
EXPOSE 5000

# Run as the image's built-in non-root user rather than root.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
