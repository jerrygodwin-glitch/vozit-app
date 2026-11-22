'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Nav, Top } from '@/lib/ui'
import { useAuth } from '@/hooks/useAuth'
import { useUITranslation } from '@/hooks/useUITranslation'
import { createBrowserClient } from '@/lib/supabase'

const TC: Record<string, { c: string; rate: string }> = { starter: { c: '#22C55E', rate: '40%' }, silver: { c: '#64748B', rate: '45%' }, gold: { c: '#CA8A04', rate: '50%' }, platinum: { c: '#7C3AED', rate: '55%' } }

// Tier names (Starter/Silver/Gold/Platinum) are left untranslated — they're
// the same branded tier labels shown everywhere else in the app (badges,
// the feed, etc.), not generic copy, so translating them here only would
// make this one page inconsistent with the rest of the product.
const SETTINGS_STRINGS = {
  pageTitle: 'Settings',
  loading: 'Loading...',
  revenue: 'revenue',
  tierProgression: 'TIER PROGRESSION',
  reports: 'reports',
  earnings: 'Earnings',
  payouts: 'Payouts',
  social: 'Social',
  licensing: 'Licensing',
  blockedAccounts: 'Blocked Accounts',
  signOut: 'Sign out',
  deleteAccount: 'Delete my account',
}

export default function Settings() {
  const { user, loading, signOut } = useAuth()
  const tr = useUITranslation('settings', SETTINGS_STRINGS)
  const t = TC[user?.tier || 'starter'] || TC.starter
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [confirmUsername, setConfirmUsername] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    setDeleting(true); setDeleteError('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: confirmUsername.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error || 'Could not delete your account.'); setDeleting(false); return }
      await createBrowserClient().auth.signOut()
      router.push('/')
    } catch (e: any) {
      setDeleteError(e.message); setDeleting(false)
    }
  }
  const menuItems = [
    { i: '📊', t: tr.earnings, h: '/earnings' }, { i: '💰', t: tr.payouts, h: '/payouts' },
    { i: '📱', t: tr.social, h: '/settings/social' }, { i: '📄', t: tr.licensing, h: '/licensing' },
    { i: '🚫', t: tr.blockedAccounts, h: '/settings/blocked' },
  ]
  return (
    <div className="page">
      <Top />
      <div className="container">
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>{tr.pageTitle}</h1>
        {loading ? (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>{tr.loading}</div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: `linear-gradient(135deg,${t.c},${t.c}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>{(user?.display_name || '?').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>@{user?.username || '...'}</div>
              <div style={{ fontSize: 13, color: t.c }}>★ {(user?.tier || 'starter').charAt(0).toUpperCase() + (user?.tier || 'starter').slice(1)} — {t.rate} {tr.revenue}</div>
            </div>
          </div>
        )}
        <div className="card">
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{tr.tierProgression}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[{ l: 'Starter', s: '40%', r: '0-25', c: '#22C55E' }, { l: 'Silver', s: '45%', r: '26-100', c: '#64748B' }, { l: 'Gold', s: '50%', r: '101-499', c: '#CA8A04' }, { l: 'Platinum', s: '55%', r: '500+', c: '#7C3AED' }].map(t => (
              <div key={t.l} style={{ padding: 10, borderRadius: 12, background: t.c + '10', border: '1px solid ' + t.c + '25' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.c }}>★ {t.l}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{t.s}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{t.r} {tr.reports}</div>
              </div>
            ))}
          </div>
        </div>
        {menuItems.map(s => (
          <a key={s.h} href={s.h} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1a1a1a' }}>
            <span style={{ fontSize: 28 }}>{s.i}</span>
            <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{s.t}</span>
            <span style={{ color: '#ccc', fontSize: 18 }}>›</span>
          </a>
        ))}
        {/* Every "signed in" indicator across the app (the shared Top
            header, the homepage's own header) links here — confirmed
            directly there was no sign-out control reachable from this
            page at all, only from a separate /profile screen behind the
            bottom nav's "More" tab, which isn't even shown on the
            homepage. */}
        <button onClick={signOut} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#DC2626', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: 28 }}>🚪</span>
          <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{tr.signOut}</span>
        </button>

        <button onClick={() => setShowDelete(true)} style={{ width: '100%', marginTop: 24, padding: 12, borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {tr.deleteAccount}
        </button>

        {showDelete && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Are you sure you want to delete your account?</h2>
              <ul style={{ paddingLeft: 18, marginBottom: 16, fontSize: 13, color: '#444', lineHeight: 1.7 }}>
                <li>Your account and profile will be permanently deleted</li>
                <li>Your published reports will remain available as part of the public record</li>
                <li>Any pending earnings will be forfeited</li>
                <li>Previously granted media licenses remain valid through their duration</li>
                <li><strong>This action cannot be undone</strong></li>
              </ul>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                Type your username (<strong>{user?.username}</strong>) to confirm:
              </p>
              <input
                value={confirmUsername}
                onChange={e => setConfirmUsername(e.target.value)}
                placeholder={user?.username}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', marginBottom: 10 }}
              />
              {deleteError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowDelete(false); setConfirmUsername(''); setDeleteError('') }}
                  style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmUsername.trim() !== user?.username}
                  style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (deleting || confirmUsername.trim() !== user?.username) ? 0.5 : 1 }}
                >
                  {deleting ? 'Deleting...' : 'Delete my account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Nav active="/settings" />
    </div>
  )
}
