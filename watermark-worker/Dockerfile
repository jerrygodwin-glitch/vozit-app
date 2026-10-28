FROM node:22-bookworm-slim

# ffmpeg for the actual video processing. fonts-dejavu-core alone was a
# wrong assumption — confirmed directly by listing what it actually
# installs: DejaVuSans(-Bold) / DejaVuSerif(-Bold) / DejaVuSansMono(-Bold)
# only, no oblique/italic variant at all. server.js's end-card "I was
# there..." text has been quietly rendering in the regular (non-italic)
# weight this whole time as a result — FFmpeg doesn't error when a
# fontfile path doesn't exist, it just silently falls back to a default.
# The oblique variants are a genuinely separate Debian package.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg fonts-dejavu-core fonts-dejavu-extra ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY assets ./assets

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
