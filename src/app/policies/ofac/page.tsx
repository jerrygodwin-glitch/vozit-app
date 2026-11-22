import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Sanctions & Compliance — VozIt!',
  description: 'How VozIt screens payouts against U.S. sanctions requirements.',
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

export default function OfacPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Sanctions & Compliance</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt complies with applicable U.S. sanctions laws, and screens every
          payout before it goes out.
        </p>

        <h2 style={S.h2}>Screening</h2>
        <p style={S.p}>
          Every withdrawal is screened against the U.S. Treasury Department's Office
          of Foreign Assets Control (OFAC) Specially Designated Nationals (SDN) list
          before it's released, across all 8 of VozIt's payout providers.
        </p>

        <h2 style={S.h2}>If you're flagged</h2>
        <p style={S.p}>
          If a payout is flagged during screening, it's held pending review rather
          than released or automatically rejected. VozIt may also be unable to
          process payouts to certain countries or individuals subject to U.S.
          sanctions, regardless of the payout provider used.
        </p>

        <h2 style={S.h2}>Reporters in sanctioned regions</h2>
        <p style={S.p}>
          VozIt is exploring partnerships with press-freedom organizations to help
          route payouts to journalists in sanctioned regions through properly
          licensed channels. Nothing here is a promise that this exists yet — it's
          an active area of work, not a finished feature.
        </p>

        <h2 style={S.h2}>Your certification</h2>
        <p style={S.p}>
          When you register, you certify that you're not subject to applicable
          sanctions — see the{' '}
          <a href="/policies/contributor-agreement" style={{ color: '#0a8fe8' }}>Reporter & Contributor Agreement</a>.
          VozIt may also ask for additional identity verification before releasing
          payouts above certain amounts.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Questions about sanctions compliance: email{' '}
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
