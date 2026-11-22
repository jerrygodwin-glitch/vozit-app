import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Refund Policy — VozIt!',
  description: 'How refunds work for media licensing, reporter payouts, and assignment funding.',
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

export default function RefundsPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Refund Policy</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt doesn't charge reporters or viewers a subscription fee, so this
          policy only covers the two kinds of payments that actually flow through
          the platform: media licensing purchases and assignment funding.
        </p>

        <h2 style={S.h2}>Media licensing purchases</h2>
        <ul style={S.ul}>
          <li style={S.li}>If footage is later proven to have been fabricated, staged, or materially misrepresented, you get a full refund.</li>
          <li style={S.li}>If you purchased a license but haven't downloaded or used the content yet, you can get a full refund within 24 hours of purchase.</li>
          <li style={S.li}>Once content has been downloaded and the license period has started, the license has been delivered and isn't refundable.</li>
          <li style={S.li}>If VozIt removes content for moderation reasons during your active license, you get a prorated refund for the remaining license duration.</li>
        </ul>

        <h2 style={S.h2}>Reporter payouts</h2>
        <p style={S.p}>
          Revenue that's been earned and paid out to a reporter isn't refundable. If
          VozIt discovers fraud after a payout has already gone out, VozIt may
          deduct the amount from that reporter's future earnings instead.
        </p>

        <h2 style={S.h2}>Assignment funding</h2>
        <p style={S.p}>
          If you've funded an assignment and reports have already been submitted and
          accepted against it, those funds have been distributed and aren't
          refundable. If an assignment's deadline passes with no qualifying
          submissions, contact us — <strong>this is handled case-by-case for now</strong>,
          not through an automated refund yet. We're deliberately not promising a
          specific automatic process here until one actually exists.
        </p>

        <h2 style={S.h2}>Requesting a refund</h2>
        <p style={S.p}>
          Email{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>{' '}
          with what you purchased or funded and why. See the full{' '}
          <a href="/policies" style={{ color: '#0a8fe8' }}>Terms and Policies</a> page
          for everything else, including the{' '}
          <a href="/policies/licensing-agreement" style={{ color: '#0a8fe8' }}>Media Licensing Agreement</a>{' '}
          this builds on.
        </p>
      </div>
      <Nav />
    </div>
  )
}
