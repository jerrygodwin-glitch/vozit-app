import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Privacy Policy — VozIt!',
  description: 'How VozIt! collects, uses, and protects your information.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  updated: { fontSize: 12, color: '#999', marginBottom: 28 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 6 },
  ul: { paddingLeft: 20, marginBottom: 10 },
}

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt! ("VozIt," "we," "us") operates a citizen journalism platform where
          reporters capture and share eyewitness video, and viewers read, watch, and
          support that reporting. This policy explains what information we collect,
          why we collect it, and how it's used — including for the advertising that
          helps fund VozIt and pay reporters.
        </p>

        <h2 style={S.h2}>Information we collect</h2>
        <p style={S.p}><strong>Account information.</strong> Email address, username,
          display name, and password (stored securely, never in plain text) when you
          register. If you sign in with Google or Facebook, we receive your name,
          email, and profile photo from that provider instead.</p>
        <p style={S.p}><strong>Report content and verification data.</strong> When you
          submit a report, we collect the video itself along with location (GPS
          coordinates), device orientation (compass bearing and tilt), altitude, and
          timezone — read directly from your device's own sensors at the moment of
          capture. This "ground-truth" data is core to how VozIt verifies that a
          report was genuinely filmed where and when it claims to be, and is shown
          alongside published reports as part of their credibility signals.</p>
        <p style={S.p}><strong>Payment information.</strong> If you receive payouts or
          make a payment (e.g. licensing a report), payment details are collected and
          processed by our payment partners (including Stripe and our payout
          providers) — VozIt does not store your full card or bank account numbers on
          its own servers.</p>
        <p style={S.p}><strong>Usage and device information.</strong> IP address,
          browser/device type, and similar technical data, used for security (for
          example, detecting fraudulent voting patterns) and to keep the service
          reliable.</p>
        <p style={S.p}><strong>Cookies.</strong> We use cookies to keep you signed in
          and to remember your preferences. If advertising is active on VozIt,
          Google and its advertising partners may also use cookies and similar
          technologies to serve and measure ads — see "Advertising" below.</p>

        <h2 style={S.h2}>How we use information</h2>
        <ul style={S.ul}>
          <li style={S.li}>To operate the platform — publishing reports, processing payouts, and showing you relevant content</li>
          <li style={S.li}>To verify the authenticity of reports using device-sourced location and sensor data</li>
          <li style={S.li}>To moderate content for safety and legal compliance before publication</li>
          <li style={S.li}>To detect and prevent fraud, including fake accounts and manipulated voting</li>
          <li style={S.li}>To communicate with you — account verification, password resets, and service updates</li>
          <li style={S.li}>To comply with legal obligations, including sanctions and payment-compliance screening on payouts</li>
        </ul>

        <h2 style={S.h2}>Advertising</h2>
        <p style={S.p}>
          VozIt uses Google AdSense to show ads that help fund the platform and pay
          reporters their share of revenue. Google and its partners use cookies to
          serve ads based on your visits to VozIt and other sites, and to measure how
          ads perform. You can learn more about how Google uses this data, and
          control your ad personalization settings, at{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>
            Google's Partner Sites policy
          </a>{' '}
          and{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>
            Google Ads Settings
          </a>.
          If you're in the European Economic Area, additional consent is required
          before personalized ads are shown; without it, you'll see non-personalized
          ads instead.
        </p>

        <h2 style={S.h2}>Who we share information with</h2>
        <p style={S.p}>We share information with the service providers that make
          VozIt work, each only for the purpose of providing their specific
          service:</p>
        <ul style={S.ul}>
          <li style={S.li}>Supabase — account data, report data, and authentication</li>
          <li style={S.li}>Mux — video hosting, streaming, and processing</li>
          <li style={S.li}>Stripe and our payout providers — payments and reporter payouts</li>
          <li style={S.li}>Hive — automated content moderation</li>
          <li style={S.li}>Resend — transactional email (account verification, password resets)</li>
          <li style={S.li}>Google (AdSense) — advertising, as described above</li>
        </ul>
        <p style={S.p}>
          Published reports — including their title, description, video, and
          location — are public by design: that's the point of citizen journalism.
          We do not sell your personal account information (email, password, payment
          details) to third parties.
        </p>

        <h2 style={S.h2}>Your choices</h2>
        <p style={S.p}>
          You can update your account information from Settings at any time. You can
          request deletion of your account by contacting us at the email below —
          note that published reports may remain available as part of the public
          record, consistent with how journalism archives work, even after an
          account is deleted.
        </p>

        <h2 style={S.h2}>Children's privacy</h2>
        <p style={S.p}>
          VozIt is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13.
        </p>

        <h2 style={S.h2}>Changes to this policy</h2>
        <p style={S.p}>
          We may update this policy as VozIt evolves. We'll update the "Last
          updated" date above when we do.
        </p>

        <h2 style={S.h2}>Contact us</h2>
        <p style={S.p}>
          Questions about this policy or your data? Email{' '}
          <a href="mailto:privacy@vozit.net" style={{ color: '#0a8fe8' }}>privacy@vozit.net</a>.
        </p>
      </div>
      <Nav />
    </div>
  )
}
