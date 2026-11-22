import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'DMCA & Copyright Takedown Policy — VozIt!',
  description: 'How to report copyright infringement on VozIt, and how a reporter can dispute a takedown.',
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

export default function DmcaPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>DMCA & Copyright Takedown Policy</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt respects the intellectual property rights of others and expects
          reporters to do the same. This policy explains how to report content you
          believe infringes your copyright, and how a reporter can respond if their
          content is taken down.
        </p>

        <h2 style={S.h2}>How to file a takedown notice</h2>
        <p style={S.p}>
          Under the U.S. Digital Millennium Copyright Act (17 U.S.C. § 512(c)(3)), a
          valid takedown notice must include all of the following:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>A physical or electronic signature of the copyright owner, or someone authorized to act on their behalf</li>
          <li style={S.li}>Identification of the copyrighted work you claim has been infringed</li>
          <li style={S.li}>Identification of the material on VozIt you claim is infringing, specific enough for us to locate it (a direct link to the report)</li>
          <li style={S.li}>Your contact information — name, address, phone number, and email</li>
          <li style={S.li}>A statement that you have a good-faith belief the use isn't authorized by the copyright owner, its agent, or the law</li>
          <li style={S.li}>A statement, made under penalty of perjury, that the information in your notice is accurate and that you're authorized to act for the copyright owner</li>
        </ul>
        <p style={S.p}>
          Send notices to{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>.
          A notice missing any of the elements above may not be actionable under the
          law, and we may ask you to resubmit it with the missing information.
        </p>

        <h2 style={S.h2}>Counter-notification</h2>
        <p style={S.p}>
          If your content was removed and you believe that was a mistake or
          misidentification, you can file a counter-notice. It needs to include:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Your physical or electronic signature</li>
          <li style={S.li}>Identification of the material removed and where it appeared before removal</li>
          <li style={S.li}>A statement, under penalty of perjury, that you have a good-faith belief the material was removed as a result of mistake or misidentification</li>
          <li style={S.li}>Your name, address, and phone number, and a statement that you consent to the jurisdiction of the federal court in your district (or, if outside the U.S., any judicial district where VozIt may be found) and will accept service of process from the person who filed the original notice</li>
        </ul>
        <p style={S.p}>
          Send counter-notices to the same address above. Unless the original
          complainant informs us they've filed a court action within 10–14 business
          days of receiving your counter-notice, we'll typically restore the content.
        </p>

        <h2 style={S.h2}>Repeat infringers</h2>
        <p style={S.p}>
          An account that accumulates multiple valid, unretracted DMCA takedown
          notices will be permanently terminated, consistent with the DMCA's
          repeat-infringer requirement.
        </p>

        <h2 style={S.h2}>Misuse of this process</h2>
        <p style={S.p}>
          Knowingly filing a false takedown notice or counter-notice can carry real
          legal liability for the person who filed it, including for damages. Use
          this process in good faith.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Copyright notices, counter-notices, and questions about this policy go to{' '}
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
