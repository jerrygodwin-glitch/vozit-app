import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Reporter & Contributor Agreement — VozIt!',
  description: 'What you certify when you submit a report, and how revenue-sharing works.',
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
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f3f3', color: '#333' },
}

export default function ContributorAgreementPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Reporter & Contributor Agreement</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          This governs your relationship with VozIt as a reporter submitting content
          — alongside, not instead of, VozIt's{' '}
          <a href="/terms" style={{ color: '#0a8fe8' }}>Terms of Service</a>. It
          applies no matter how you submit: the website, or VozIt's Telegram bot, and
          any other submission channel VozIt adds in the future.
        </p>

        <h2 style={S.h2}>What you certify when you submit a report</h2>
        <p style={S.p}>By submitting a report, you're certifying all of the following:</p>
        <ul style={S.ul}>
          <li style={S.li}>You personally captured this footage, at the time and place you've indicated</li>
          <li style={S.li}>The footage is genuine and unaltered, and was not generated or synthesized by AI</li>
          <li style={S.li}>It doesn't infringe anyone else's copyright or other intellectual property rights</li>
          <li style={S.li}>You have the right to grant VozIt the license described below</li>
          <li style={S.li}>You're not on a government sanctions list (including the U.S. Treasury's OFAC list, or equivalent EU or UN lists)</li>
        </ul>

        <h2 style={S.h2}>The license you grant VozIt</h2>
        <p style={S.p}>
          You keep full copyright ownership of everything you submit. By submitting,
          you grant VozIt a worldwide, non-exclusive, sublicensable license to host,
          display, distribute, watermark, promote, and sublicense your content
          through VozIt's platform, its social media channels, and its licensing
          program — consistent with the revenue-sharing described below.
        </p>

        <h2 style={S.h2}>Revenue sharing</h2>
        <p style={S.p}>
          You earn a share of ad revenue, licensing fees, and assignment fees your
          content generates, at the rate tied to your current tier:
        </p>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Tier</th><th style={S.th}>Your share</th></tr></thead>
          <tbody>
            <tr><td style={S.td}>Starter</td><td style={S.td}>40%</td></tr>
            <tr><td style={S.td}>Silver</td><td style={S.td}>45%</td></tr>
            <tr><td style={S.td}>Gold</td><td style={S.td}>50%</td></tr>
            <tr><td style={S.td}>Platinum</td><td style={S.td}>55%</td></tr>
          </tbody>
        </table>
        <p style={S.p}>
          For licensing fees specifically: VozIt retains 30% of the fee as a platform
          charge covering moderation, distribution, and infrastructure, and your tier
          percentage then applies to the remaining 70%. Tier rates may be adjusted
          going forward; changes never apply retroactively to revenue you've already
          earned. Payouts are processed through third-party providers and screened
          against OFAC sanctions lists before release — see{' '}
          <a href="/policies/ofac" style={{ color: '#0a8fe8' }}>Sanctions & Compliance</a>.
        </p>

        <h2 style={S.h2}>Requesting removal</h2>
        <p style={S.p}>
          You can ask VozIt to remove your content at any time. Removal doesn't
          unwind a license VozIt had already granted to a media organization before
          your request — that license stays valid for its original duration.
        </p>

        <h2 style={S.h2}>VozIt's rights over your content</h2>
        <p style={S.p}>
          VozIt may decline to publish, blur graphic portions of, watermark, or
          remove content that violates the{' '}
          <a href="/terms" style={{ color: '#0a8fe8' }}>Terms of Service</a> or
          applicable law — see the{' '}
          <a href="/policies/moderation" style={{ color: '#0a8fe8' }}>Correction & Moderation Policy</a>{' '}
          for how that actually works.
        </p>

        <h2 style={S.h2}>Indemnification</h2>
        <p style={S.p}>
          You agree to indemnify VozIt against claims arising from your content —
          including copyright infringement, defamation, or privacy-violation claims
          brought by someone else over what you submitted.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Questions about this agreement: email{' '}
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
