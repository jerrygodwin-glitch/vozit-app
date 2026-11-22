import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Reporter Safety — VozIt!',
  description: 'VozIt does not ask reporters to put themselves at risk. Safety guidance for reporting from dangerous situations.',
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

export default function SafetyPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Reporter Safety</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt does not encourage, require, or instruct anyone to enter a dangerous
          area or conflict zone to capture footage. Reporting from a protest,
          natural disaster, conflict zone, or any other dangerous situation is
          entirely your own choice and at your own risk. VozIt isn't responsible for
          any injury, harm, detention, or worse that happens while you're capturing
          footage.
        </p>

        <h2 style={S.h2}>Safety guidelines</h2>
        <ul style={S.ul}>
          <li style={S.li}>Never put yourself in danger to get a shot</li>
          <li style={S.li}>If you feel unsafe, stop recording and leave immediately</li>
          <li style={S.li}>Don't reveal your identity on camera if doing so could put you at risk</li>
          <li style={S.li}>If you're somewhere journalism is restricted, consider VozIt's{' '}<a href="/submit-telegram" style={{ color: '#0a8fe8' }}>Telegram bot</a> as a lower-profile way to submit</li>
          <li style={S.li}>If you're facing threats connected to your reporting, press-freedom organizations like the{' '}
            <a href="https://cpj.org" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>Committee to Protect Journalists (CPJ)</a>{' '}
            or{' '}
            <a href="https://rsf.org" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>Reporters Without Borders (RSF)</a>{' '}
            are worth contacting</li>
        </ul>

        <h2 style={S.h2}>Pseudonymous reporting</h2>
        <p style={S.p}>
          If you publish under a display name or username that isn't your real
          name, VozIt won't reveal your real identity, except where compelled by
          valid legal process — see{' '}
          <a href="/policies/law-enforcement" style={{ color: '#0a8fe8' }}>Law Enforcement Guidelines</a>{' '}
          for exactly what that means.
        </p>

        <h2 style={S.h2}>Assignments are voluntary</h2>
        <p style={S.p}>
          You're never required to accept or complete an assignment. Funded
          assignments are an invitation, not an obligation — it's always your call
          whether a given request is one you're willing and able to fulfill safely.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Questions about this page: email{' '}
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
