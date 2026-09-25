'use client'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'

const TIER_COLOR: Record<string, string> = { starter: '#22C55E', silver: '#64748B', gold: '#CA8A04', platinum: '#7C3AED' }

export const sb = createClient(
  'https://mfanqkbhegxppyitxtye.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'
)

export const LOGO = 'data:image/webp;base64,UklGRsgFAABXRUJQVlA4ILwFAACwHwCdASpAAEAAPjEUiEKiISEWDAcwIAMEtgBdnIAfgB1dmROP/iN+wH/A6PrYnuV+4/+O508lnVb9m+2ztAfZn7gH6Qf1L7ZuEB/Df57/qP8p7LnUAfzP+wdYd+pPsAfsz6UH7gfA9+2n/G/wHwI/qn/4b0l/E+D/i/8w+yHGzY+/etAL/mP90/JHIqtMv+zvGwxxf8P7Zviv/z/KJ+Z/4j/ne4H/Lf6p/z/Wg6kBJ0jFlZSafccrQogR2/n7T+HtRVjTVSgBgEWnH2dr7Pzhde13/20VdYD726enDmcHdmgJ9QKVs7ZbByY4BMEgmweRhKKbL6HjrNrR5IUbJLwfYn4XU82AAP7//lRHI+ZI+vAA8Vi0Av6TGfDvy8oZokSm3Msb25DuZ4A/FmJOqpDpNhsBkf/KTOldfjNFoH8j7rm/HtD4vauP+/lIbjlkbowSABr8OVkI08eFGArnK1m12ARFkGI2/pcUsWihCZd/QKbArGSTSOpf7UA23rTfEtGxgwfJe+ogQcjct8nCHN6uyp3yvZ9kql+/kNbWzR5Kcm+ut6vm0wMeYfc1qg9FEpsYlFdNRR55fZIjMKErLGH3Gr5QQvVpoYEQIWXJLWMUOmMwEbeoUR2Pt1X2dp4VHJSUIxhuCFCGDl98znxxtXGToy3Y60fV3oQu+T1MSdIAhdoNnpbCROHc5sU+eaTUp0l97nMrgd2aFuIhzPwDoALLS4kwxQBGarJB+xLHrRDmlL8Xq/dX9KIENGW/kVqzuE7/TE8pUyKGKjH78FyRLWLTaKagohgBJ5hxKR3aKlNq/a13Z2V86fvTyBxwjeT97TvEp8AUm2gR9MdAdH37z+jS/d95Gl95G691ciKgj4pOhLiHlfJYTTEgQPT034e2p/04XuEThzC7sXQTY6Nc8dhW+F9sxprJmYbO8LjXcdizfEUgW6QiuvR3Oh0ya68cIceykBJkVZ05dWIRe+fNfx/jQ9OKVKNrX2h2ZdRMbPmFZK1mvAPQ9FtG87/HIPTQkL+h1T/8dAaOu0BymNcTDaEJHv8N75+DomsKxcHtcyK/O/2M7TNaDGCd0BmT5UqFkgDuxUv+9DK27yXpDVRdczwPq+JAxXicBQB7kf/zJXw2shpvXlo3mdPemT1G704pSpsKMpFHZa55GVXdqq8PFMcSV52vZ/VoEqwHU978mEyJ/Rvzivc9FsD1yuasfjaagHWhEBzHk/tv5oPy0BGCWJTmH+wsmETmVuIYpR+5qwooNXn12d5ZOA5kyaPBbJ6Nf3U1vRpgvrLtO8wYZaGOB0IE/Y1v3ZmbjrPgrXZzDf8RymWKuSb/C6h/lUvwDnFK3WxAxSO6MUXYYWPaNKdfIrjwFpMUWlWY+40i+yx0LyrIAeA0pP8/konCIQcuMRKGrpceuh/+SmWU//yZD0hdYgQjwbu+v+SydCUijljyfDX2BpQDJrCZ0sjITQi5VoILUOpjaDxYNLY8bSHb8iauknuRwUrIoDdpS+ZkV0tz3pgdfYYShbw78U4e5GXbz4vA2S+bD2z4hEgfl79FEO8EW4AzI3fXQa0cQm3I3CbsROKscxIChpqdVKFGk0Cp/f7cJ+f8GoecifXrIUkyU5N5T4twugj1Z9qUuYSJpFnSeIZOaE7FLp3qZg+RZV5pic2XMmP2GG8vltxVJGmWCI2JSiOf9Srt4ROPehL/+C5ix946gzH5TRHd2hN0VOe0v6Yi4Zzj5b2JjLjlWVv9kynVoDk2H6JMEduMPh7xlbvebBSqx4l6ye1aYekQ3kZ9IfcnaDIHGvIrxvgpy4rgcN4V3Uj6VZmahk7dsoJpF0VcSIEWSA1OZXGk0DuVDHgAAhX9sXLNzk1cuuj/pP9r7WQQ/luzktTXcKj8DmbRsj9xto1fkUJV7cAUd8am0vqzVnPxmbf6ZP7HDlB2USVllryeffjt42QzSxYDobMMhAAA'

const NAV_ITEMS = [
  { h: '/feed', l: 'Feed', i: '📰' },
  { h: '/assignments', l: 'Assign', i: '📋' },
  { h: '/tasks', l: 'Tasks', i: '🙋' },
  { h: '/upload', l: '', i: '🎥', c: true },
  { h: '/search', l: 'Search', i: '🔍' },
  { h: '/settings', l: 'More', i: '⚙️' },
]

export function Nav({ active }: { active?: string }) {
  return (
    <nav aria-label="Main navigation" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 56,
      background: '#fff', borderTop: '1px solid #eee',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      maxWidth: 600, margin: '0 auto', zIndex: 50,
    }}>
      {NAV_ITEMS.map(t => t.c ? (
        <a key={t.h} href={t.h} aria-label="Record a report" style={{
          width: 52, height: 52, borderRadius: 26,
          background: '#FE3D07', border: '3px solid #fff',
          boxShadow: '0 2px 10px rgba(254,61,7,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: -18, fontSize: 20, transition: 'transform .15s',
        }}>{t.i}</a>
      ) : (
        <a key={t.h} href={t.h} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: active === t.h ? '#FE3D07' : '#999',
          fontSize: 10, fontWeight: active === t.h ? 600 : 400,
          padding: 8, minWidth: 44, minHeight: 44, justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20 }}>{t.i}</span>{t.l}
        </a>
      ))}
    </nav>
  )
}

export function Top() {
  const { user, loading } = useAuth()
  return (
    <header style={{
      background: 'linear-gradient(to right, #70b8e0, #50b0e8 30%, #18a0e8 60%, #0a3ff1)',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', cursor: 'pointer' }} aria-label="VozIt home">
        <img src={LOGO} style={{ height: 36, width: 36, borderRadius: 8 }} alt="VozIt logo" />
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>VozIt!</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontStyle: 'italic' }}>I was there...</span>
      </a>
      {loading ? null : user ? (
        <a href="/settings" style={{
          display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 20, padding: '4px 12px 4px 4px',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 11, background: TIER_COLOR[user.tier || 'starter'] || TIER_COLOR.starter,
            color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{(user.display_name || user.username || '?').slice(0, 2).toUpperCase()}</span>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>@{user.username}</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, textTransform: 'capitalize' }}>{user.tier || 'starter'}</span>
        </a>
      ) : (
        <a href="/auth/login" className="btn btn-sm" style={{
          background: 'rgba(255,255,255,0.2)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          fontSize: 13, fontWeight: 600, padding: '6px 16px',
        }}>Sign in</a>
      )}
    </header>
  )
}
