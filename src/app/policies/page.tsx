import { Top, Nav } from '@/lib/ui'

export const metadata = {
  title: 'Terms and Policies — VozIt!',
  description: 'The documents that govern use of VozIt! — terms of service, privacy, and content moderation.',
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  sub: { fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 28 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    display: 'block', textDecoration: 'none', border: '1px solid #e5e5e5', borderRadius: 10,
    padding: '16px 18px',
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#666', lineHeight: 1.5 },
  note: { fontSize: 12, color: '#999', marginTop: 24, lineHeight: 1.6 },
}

const DOCS = [
  {
    href: '/terms',
    title: 'Terms of Service',
    desc: 'The rules that govern creating an account, submitting reports, and the revenue-sharing program.',
  },
  {
    href: '/policies/moderation',
    title: 'Correction & Moderation Policy',
    desc: 'How VozIt reviews, removes, and corrects reports — and how to flag or dispute something.',
  },
  {
    href: '/privacy',
    title: 'Privacy Policy',
    desc: 'What information VozIt collects, how it’s used, and your choices about it.',
  },
]

export default function PoliciesPage() {
  return (
    <div style={S.page}>
      <style>{`.policy-card{transition:border-color .15s}.policy-card:hover{border-color:#ccc}`}</style>
      <Top />
      <div style={S.wrap}>
        <h1 style={S.h1}>Terms and Policies</h1>
        <p style={S.sub}>
          The documents that govern VozIt. We'll keep adding to this list as the
          platform grows, so it's the place to check for the current version of
          any of them.
        </p>

        <div style={S.list}>
          {DOCS.map(d => (
            <a key={d.href} href={d.href} className="policy-card" style={S.card}>
              <div style={S.cardTitle}>{d.title} →</div>
              <div style={S.cardDesc}>{d.desc}</div>
            </a>
          ))}
        </div>

        <p style={S.note}>
          More policy documents will appear here as they're published. Questions
          about any of these? Email{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>.
        </p>
      </div>
      <Nav />
    </div>
  )
}
