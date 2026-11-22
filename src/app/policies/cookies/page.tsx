import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Cookie Policy — VozIt!',
  description: 'What cookies and similar technology VozIt uses, and why.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  back: { fontSize: 13, color: '#0a8fe8', textDecoration: 'none', display: 'inline-block', marginBottom: 14 },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  updated: { fontSize: 12, color: '#999', marginBottom: 28 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 6 },
  ul: { paddingLeft: 20, marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f3f3', color: '#333', verticalAlign: 'top' },
}

export default function CookiePolicyPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Cookie Policy</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          This explains the cookies and similar browser storage VozIt actually uses today,
          and what changes if that ever expands (for example, once advertising goes live).
        </p>

        <h2 style={S.h2}>What VozIt uses right now</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Type</th>
              <th style={S.th}>What it's for</th>
              <th style={S.th}>Can you opt out?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Login session cookies</td>
              <td style={S.td}>Keep you signed in between pages and visits. Set by Supabase, the service that runs VozIt's accounts.</td>
              <td style={S.td}>No — these are required for the site to work. Blocking them means you can't stay signed in.</td>
            </tr>
            <tr>
              <td style={S.td}>Anonymous site analytics</td>
              <td style={S.td}>Vercel Analytics, which counts page visits in a privacy-preserving way and does not use cookies or track you individually across sites.</td>
              <td style={S.td}>Nothing to opt out of — it isn't cookie-based.</td>
            </tr>
            <tr>
              <td style={S.td}>Google (advertising infrastructure)</td>
              <td style={S.td}>VozIt loads Google's advertising script site-wide to verify ownership of vozit.net ahead of turning on ads. Google may set its own cookies from this script per its own policies, even before any ad actually displays.</td>
              <td style={S.td}>Use Google's <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>Ad Settings</a> to control ad personalization, or your browser's cookie controls to block it outright.</td>
            </tr>
            <tr>
              <td style={S.td}>A small on-device preference</td>
              <td style={S.td}>Remembers that you've seen this notice, so it doesn't show again. Stored in your browser, not sent to VozIt.</td>
              <td style={S.td}>Clearing your browser's site data resets it.</td>
            </tr>
          </tbody>
        </table>

        <h2 style={S.h2}>What's coming</h2>
        <p style={S.p}>
          VozIt isn't yet showing paid ads — the Google script above is currently only
          verifying site ownership. Once ads actually go live to support reporter
          revenue-sharing, this page will be updated to reflect it, and (where required
          by your location) you'll see a real choice about ad personalization, not just
          a notice.
        </p>

        <h2 style={S.h2}>Browser controls</h2>
        <p style={S.p}>
          Every modern browser lets you view, block, or delete cookies through its own
          settings. Blocking VozIt's login cookie will sign you out and prevent signing
          back in, since there's no other way for the site to recognize your session.
        </p>

        <h2 style={S.h2}>Changes to this policy</h2>
        <p style={S.p}>
          We'll update the "Last updated" date above whenever this changes. See{' '}
          <a href="/privacy" style={{ color: '#0a8fe8' }}>Privacy Policy</a> for how any
          data collected this way is otherwise handled, or the full{' '}
          <a href="/policies" style={{ color: '#0a8fe8' }}>Terms and Policies</a> page for
          everything else.
        </p>
      </div>
      <Nav />
    </div>
  )
}
