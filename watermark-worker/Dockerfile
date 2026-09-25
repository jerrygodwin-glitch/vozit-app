FROM node:20-bookworm-slim

# ffmpeg for the actual video processing; fonts-dejavu-core provides the
# exact font files the watermark filters reference (DejaVuSans /
# DejaVuSans-Bold / DejaVuSans-Oblique) — matches what the original design
# in src/lib/watermark.ts assumed would be available.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY assets ./assets

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
