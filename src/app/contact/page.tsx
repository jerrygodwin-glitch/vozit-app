import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Contact — VozIt!',
  description: 'Get in touch with the VozIt! team.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  intro: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 28 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  email: { color: '#0a8fe8', fontWeight: 600 },
}

export default function ContactPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <h1 style={S.h1}>Contact</h1>
        <p style={S.intro}>
          VozIt! is a citizen journalism platform — reporters capture and share
          eyewitness video, and viewers read, watch, and support that reporting. If
          you have a question, a concern, or something to report, reach us at{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>{' '}
          and we'll get back to you.
        </p>

        <h2 style={S.h2}>General questions</h2>
        <p style={S.p}>
          Questions about how VozIt works, your account, or reporting — email{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>.
        </p>

        <h2 style={S.h2}>Press &amp; media</h2>
        <p style={S.p}>
          Working on a story about citizen journalism or VozIt itself? We're happy to
          talk — email{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>.
        </p>

        <h2 style={S.h2}>Licensing a report</h2>
        <p style={S.p}>
          For questions about licensing footage you've seen on VozIt, see our{' '}
          <a href="/licensing" style={S.email}>Licensing</a> page, or email{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>{' '}
          directly.
        </p>

        <h2 style={S.h2}>Report a problem</h2>
        <p style={S.p}>
          Found a bug, a safety concern, or content that violates our guidelines?
          Email{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>{' '}
          with as much detail as you can — a link to the report, a screenshot, or
          what you were doing when the issue happened all help us track it down.
        </p>

        <h2 style={S.h2}>Privacy &amp; legal</h2>
        <p style={S.p}>
          For questions about your data or our policies, see our{' '}
          <a href="/privacy" style={S.email}>Privacy Policy</a> and{' '}
          <a href="/terms" style={S.email}>Terms of Service</a>, or email{' '}
          <a href="mailto:vozitnews@gmail.com" style={S.email}>vozitnews@gmail.com</a>.
        </p>
      </div>
      <Nav />
    </div>
  )
}
