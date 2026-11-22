import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Law Enforcement Guidelines — VozIt!',
  description: 'How VozIt handles legal requests for user information.',
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
}

export default function LawEnforcementPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Law Enforcement Guidelines</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          This explains how VozIt handles requests from law enforcement and other
          government bodies for user information.
        </p>

        <h2 style={S.h2}>Legal process required</h2>
        <p style={S.p}>
          VozIt discloses user information in response to valid legal process — a
          subpoena, court order, or search warrant, as appropriate to what's being
          requested. VozIt does not voluntarily hand over user data to any
          government absent legal process.
        </p>

        <h2 style={S.h2}>Emergency requests</h2>
        <p style={S.p}>
          If law enforcement believes there's an imminent threat to someone's life,
          VozIt may disclose limited information without legal process first, to the
          extent necessary to address that emergency.
        </p>

        <h2 style={S.h2}>What VozIt can provide</h2>
        <ul style={S.ul}>
          <li style={S.li}>Account information — email address, username, registration date</li>
          <li style={S.li}>IP address logs</li>
          <li style={S.li}>Report metadata — timestamps, GPS coordinates captured with a submission</li>
          <li style={S.li}>Video content itself</li>
        </ul>

        <h2 style={S.h2}>What VozIt cannot provide</h2>
        <ul style={S.ul}>
          <li style={S.li}>Passwords — stored as one-way hashes, not in a readable form, so VozIt itself can't retrieve them</li>
          <li style={S.li}>Full payment details — processed by Stripe and VozIt's payout providers, not stored by VozIt. Contact those providers directly for payment-specific requests.</li>
        </ul>

        <h2 style={S.h2}>Preservation requests</h2>
        <p style={S.p}>
          Law enforcement can ask VozIt to preserve an account's data for 90 days
          pending formal legal process.
        </p>

        <h2 style={S.h2}>User notice</h2>
        <p style={S.p}>
          VozIt will notify an affected user of a legal request for their
          information unless legally prohibited from doing so — for example, by a
          court-ordered gag provision.
        </p>

        <h2 style={S.h2}>Published reports</h2>
        <p style={S.p}>
          Reports that have already been published are public by design — accessing
          them doesn't require legal process of any kind, since that's the same
          information anyone can already see on VozIt.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Send legal requests to{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>.
          See the full{' '}
          <a href="/policies" style={{ color: '#0a8fe8' }}>Terms and Policies</a> page
          for everything else.
        </p>
      </div>
      <Nav />
    </div>
  )
}
