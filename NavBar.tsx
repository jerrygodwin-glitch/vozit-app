// @ts-nocheck
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { VOZIT_LOGO } from '@/lib/logo'

const TABS = [
  { href: '/feed', label: 'Locations', icon: '\ud83d\udcf0' },
  { href: '/assignments', label: 'Assignments', icon: '\ud83d\udccb' },
  { href: '/upload', label: '', icon: '\ud83c\udfa5', center: true },
  { href: '/tasks', label: 'Tasks', icon: '\u270e' },
  { href: '/profile', label: 'More', icon: '\u22ef' },
]

export function NavBar({ active }: { active?: string }) {
  const path = usePathname()
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 50, background: '#fff', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', zIndex: 50, maxWidth: 600, margin: '0 auto' }}>
      {TABS.map(t => {
        const a = path === t.href || active === t.href.slice(1)
        return t.center ? (
          <Link key={t.href} href={t.href} style={{ width: 48, height: 48, borderRadius: 24, background: '#FE3D07', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(254,61,7,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -16, fontSize: 18, textDecoration: 'none' }}>{t.icon}</Link>
        ) : (
          <Link key={t.href} href={t.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textDecoration: 'none', color: a ? '#0a8fe8' : '#999', fontSize: 9, fontWeight: a ? 600 : 400, padding: '8px 0' }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function TopBar() {
  return (
    <div style={{ background: 'linear-gradient(to right, #f0e8d8, #b8d8f0 25%, #50b0e8 50%, #18a0e8 75%, #0a3ff1)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <img src={VOZIT_LOGO} alt="VozIt - I was there" style={{ height: 42, width: 42, borderRadius: 8 }} />
      <div style={{ width: 26, height: 26, borderRadius: 13, border: '1.5px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>i</div>
    </div>
  )
}
