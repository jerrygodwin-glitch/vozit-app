import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Media Licensing Agreement — VozIt!',
  description: 'The terms that govern a media organization licensing footage from VozIt.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  back: { fontSize: 13, color: '#0a8fe8', textDecoration: 'none', display: 'inline-block', marginBottom: 14 },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  updated: { fontSize: 12, color: '#999', marginBottom: 28 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  h3: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 4, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 6 },
  ul: { paddingLeft: 20, marginBottom: 10 },
  note: { fontSize: 12, color: '#999', fontStyle: 'italic' },
}

export default function LicensingAgreementPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Media Licensing Agreement</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          This governs licensing footage from VozIt as a media organization or other
          licensee. It applies alongside VozIt's{' '}
          <a href="/terms" style={{ color: '#0a8fe8' }}>Terms of Service</a>, not in
          place of it. Prices and durations below are shown on the{' '}
          <a href="/licensing" style={{ color: '#0a8fe8' }}>Licensing</a> page itself
          and may change there over time; this page describes the rights and
          obligations that come with each tier, not a price guarantee.
        </p>

        <h2 style={S.h2}>License tiers</h2>

        <h3 style={S.h3}>Embed License</h3>
        <p style={S.p}>
          The right to embed VozIt's player on your own site. Free for editorial use;
          $6 CPM for commercial use (where ads run around the embedded player).
          Lasts 1 year.
        </p>

        <h3 style={S.h3}>Digital License</h3>
        <p style={S.p}>
          The right to download footage and publish it across your own digital
          properties. $75 for a short social clip, $150 for standard use, $250 for
          breaking news (first 24 hours). Lasts 30 days.
        </p>

        <h3 style={S.h3}>Broadcast License</h3>
        <p style={S.p}>
          The right to air footage on TV, streaming, or in a documentary, and to
          archive it. $500 for local/regional use, $2,500 for national network use,
          $3,500 for documentary/long-form use, $7,500 for 24-hour breaking
          exclusive, $10,000 for a full 24-hour exclusive. Lasts 90 days.
        </p>

        <h3 style={S.h3}>Wire Service License</h3>
        <p style={S.p}>
          The right to redistribute footage to your own subscriber network. $3,000
          standard, $10,000 for 24–48 hour exclusive rights, $15,000 for breaking
          exclusive wire distribution. Lasts 30 days.
        </p>

        <h2 style={S.h2}>What you're actually getting</h2>
        <p style={S.p}>
          Every license is a time-limited right to use specific footage in specific
          ways — it is not a transfer of copyright. The reporter who captured the
          footage keeps their copyright; you receive the rights described above for
          the license's duration, not ownership of the underlying work.
        </p>

        <h2 style={S.h2}>Attribution</h2>
        <p style={S.p}>
          Every use must credit <strong>"Courtesy: VozIt! / @[reporter's username]"</strong>,
          shown clearly wherever the footage appears.
        </p>

        <h2 style={S.h2}>What you can and can't do with the footage</h2>
        <ul style={S.ul}>
          <li style={S.li}>You may trim footage and apply standard broadcast color correction</li>
          <li style={S.li}>You may not alter footage in a way that changes its meaning or the context of what it shows</li>
          <li style={S.li}>Your rights are limited to what your specific license tier grants — a Digital License doesn't include broadcast rights, for example</li>
        </ul>

        <h2 style={S.h2}>No warranty on footage accuracy</h2>
        <p style={S.p}>
          VozIt provides verification signals with every report — device-sourced
          location data, a credibility score, and AI-generated analysis — but these
          are signals, not a guarantee. VozIt makes no warranty that footage is
          completely accurate, and you're responsible for your own editorial
          judgment before publishing or airing it.
        </p>

        <h2 style={S.h2}>Refunds</h2>
        <p style={S.p}>
          If footage is later proven to have been fabricated, staged, or materially
          misrepresented, VozIt will issue a full refund and remove the content.
          Outside of that, licensing fees are non-refundable once a license has been
          granted and the content delivered — see the full{' '}
          <a href="/policies/refunds" style={{ color: '#0a8fe8' }}>Refund Policy</a>{' '}
          for how this applies across VozIt generally.
        </p>

        <h2 style={S.h2}>Governing law</h2>
        <p style={S.p}>
          <span style={S.note}>
            VozIt is not yet incorporated, so a specific governing-law jurisdiction
            hasn't been set here yet — this section will name one once that's
            resolved.
          </span>
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Licensing questions: email{' '}
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
