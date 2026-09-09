/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { domains: ['image.mux.com', 'stream.mux.com'] },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfanqkbhegxppyitxtye.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw',
  },
}
module.exports = nextConfig
