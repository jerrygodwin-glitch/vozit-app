import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Accessibility — VozIt!',
  description: 'VozIt’s commitment to accessibility, and how to report a barrier.',
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

export default function AccessibilityPage() {
  return (
    <div style={S.page}>
      <Top />
      <div style={S.wrap}>
        <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
        <h1 style={S.h1}>Accessibility</h1>
        <p style={S.updated}>Last updated: November 2026</p>

        <p style={S.p}>
          VozIt is committed to making its platform usable by everyone, including
          people with disabilities. We aim to conform to{' '}
          <a href="https://www.w3.org/TR/WCAG21/" target="_blank" rel="noopener noreferrer" style={{ color: '#0a8fe8' }}>
            WCAG 2.1 Level AA
          </a>{' '}
          standards.
        </p>

        <h2 style={S.h2}>What's in place today</h2>
        <ul style={S.ul}>
          <li style={S.li}>Semantic HTML structure throughout the site</li>
          <li style={S.li}>Alt text on images</li>
          <li style={S.li}>Keyboard navigation support for interactive elements</li>
          <li style={S.li}>Visible focus indicators when navigating by keyboard</li>
          <li style={S.li}>Aria-labels on navigation elements</li>
          <li style={S.li}>Color contrast ratios targeting WCAG AA</li>
        </ul>

        <h2 style={S.h2}>Known limitations</h2>
        <p style={S.p}>
          Some older pages may not yet fully meet WCAG AA in every respect — this is
          an ongoing pass, not a one-time project, and we're actively working through
          it rather than claiming it's finished everywhere already.
        </p>

        <h2 style={S.h2}>Report a barrier</h2>
        <p style={S.p}>
          If you run into something that doesn't work well with a screen reader,
          keyboard navigation, or another assistive technology, email{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>{' '}
          with what you ran into and where, and we'll work to fix it. See the full{' '}
          <a href="/policies" style={{ color: '#0a8fe8' }}>Terms and Policies</a> page
          for everything else.
        </p>
      </div>
      <Nav />
    </div>
  )
}
