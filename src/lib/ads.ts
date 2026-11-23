// Which routes are substantial enough, real-content pages to carry Google's
// AdSense script at all — the rest (auth screens, the camera/upload flow,
// account settings, the embed widget) are exactly the kind of thin, mostly-
// chrome pages AdSense's "Google-served ads on screens without publisher-
// content" policy flags, so the script should never even load there. An
// allowlist (default false for anything not explicitly listed) is the safer
// direction for this: a future page that forgets to opt in just doesn't
// show ads yet, rather than a future thin page silently getting them.
const AD_PAGE_PREFIXES = [
  '/feed',
  '/assignments',
  '/licensing',
  '/search',
  '/report/',
  '/reporter/',
  '/policies',
  '/terms',
  '/privacy',
  '/contact',
  '/submit-telegram',
]

export function shouldLoadAds(pathname: string): boolean {
  if (pathname === '/') return true
  return AD_PAGE_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}
