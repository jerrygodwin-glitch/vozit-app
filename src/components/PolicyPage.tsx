'use client'
import { useEffect, useState } from 'react'
import { Top, Nav } from '@/lib/ui'
import LanguageSelector, { readStoredPolicyLang } from './LanguageSelector'
import type { PolicyContent, PolicyLang, PolicyParagraph } from '@/lib/translations/policies/types'

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', paddingBottom: 72 },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 20px' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  back: { fontSize: 13, color: '#0a8fe8', textDecoration: 'none' },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  updated: { fontSize: 12, color: '#999', marginBottom: 16 },
  disclaimer: { background: '#f6f7f9', border: '1px solid #e5e5e5', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#666', lineHeight: 1.6, marginBottom: 24 },
  h2: { fontSize: 17, fontWeight: 700, marginTop: 28, marginBottom: 8, color: '#1a1a1a' },
  p: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 10 },
  li: { fontSize: 14, color: '#333', lineHeight: 1.7, marginBottom: 6 },
  ul: { paddingLeft: 20, marginBottom: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f3f3', color: '#333' },
}

function renderParagraph(para: PolicyParagraph, key: number) {
  if (typeof para === 'string') return <p key={key} style={S.p}>{para}</p>
  return <p key={key} style={S.p}><strong>{para.label}</strong> {para.text}</p>
}

export default function PolicyPage({ contentByLang }: { contentByLang: Partial<Record<PolicyLang, PolicyContent>> }) {
  const [lang, setLang] = useState<PolicyLang>('en')

  useEffect(() => { setLang(readStoredPolicyLang()) }, [])

  const content = contentByLang[lang] || contentByLang.en!
  const isTranslated = lang !== 'en' && !!contentByLang[lang]

  return (
    <div style={S.page} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Top />
      <div style={S.wrap}>
        <div style={S.topRow}>
          <a href="/policies" style={S.back}>&larr; Terms and Policies</a>
          <LanguageSelector value={lang} onChange={setLang} />
        </div>

        <h1 style={S.h1}>{content.title}</h1>
        <p style={S.updated}>
          {content.updatedLabel}
          {isTranslated && content.aiTranslatedLabel && <> &middot; {content.aiTranslatedLabel}</>}
        </p>

        {isTranslated && (
          <div style={S.disclaimer}>
            {content.viewInEnglishLabel ?? 'This is a translation provided for your convenience. The English version is the legally binding document.'}
            {' '}
            <a href="#" onClick={e => { e.preventDefault(); setLang('en'); try { localStorage.setItem('vozit_policy_lang', 'en') } catch {} }} style={{ color: '#0a8fe8' }}>
              {content.viewInEnglishLinkText ?? 'View in English'}
            </a>
          </div>
        )}

        {content.intro.map((p, i) => <p key={i} style={S.p}>{p}</p>)}

        {content.sections.map((section, i) => (
          <div key={i}>
            <h2 style={S.h2}>{section.heading}</h2>
            {section.paragraphs?.map((p, j) => renderParagraph(p, j))}
            {section.list && (
              <ul style={S.ul}>
                {section.list.map((item, j) => <li key={j} style={S.li}>{item}</li>)}
              </ul>
            )}
            {section.table && (
              <table style={S.table}>
                <thead>
                  <tr>{section.table.headers.map((h, j) => <th key={j} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, j) => (
                    <tr key={j}>{row.map((cell, k) => <td key={k} style={S.td}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        <p style={{ ...S.p, marginTop: 28 }}>
          {content.contactLabel}{' '}
          <a href="mailto:vozitnews@gmail.com" style={{ color: '#0a8fe8' }}>vozitnews@gmail.com</a>.
        </p>
      </div>
      <Nav />
    </div>
  )
}
