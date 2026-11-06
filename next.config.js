/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { domains: ['image.mux.com', 'stream.mux.com', 'www.google.com'] },
  // Confirmed live: a real user (Marce14) voted on a report, the count was
  // right while she stayed on the page, then reverted after navigating to
  // another report via a feed <Link> and back. The report page is already
  // `dynamic = 'force-dynamic'`, which only controls server rendering —
  // Next's separate client-side Router Cache still reuses a page's cached
  // RSC payload for `<Link>`/router navigation for up to 30s by default
  // (even on force-dynamic routes), so a revisit within that window can
  // show the pre-vote snapshot. staleTimes.dynamic: 0 disables that reuse
  // for dynamic routes app-wide, so every client-side nav to one always
  // re-fetches fresh data — correctness over the small extra round-trip,
  // appropriate for pages with live counts (votes, comments) like this one.
  experimental: { staleTimes: { dynamic: 0 } },
}
module.exports = nextConfig
