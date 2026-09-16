/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { domains: ['image.mux.com', 'stream.mux.com', 'www.google.com'] },
}
module.exports = nextConfig
