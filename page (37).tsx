// @ts-nocheck
import { NavBar, TopBar } from '@/components/ui/NavBar'
export const dynamic = 'force-dynamic'
export default async function FeedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <TopBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
        <span style={{ background: '#FE3D07', color: '#fff', padding: '5px 16px', borderRadius: 5, fontSize: 13, fontWeight: 600 }}>Reports</span>
        <div style={{ fontSize: 11, display: 'flex', gap: 10 }}>
          <a style={{ color: '#0a8fe8', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>by Location</a>
          <a style={{ color: '#0a8fe8', cursor: 'pointer' }}>by Category</a>
        </div>
      </div>
      <div style={{ padding: '8px 0 60px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 24, color: '#1a1a1a', marginBottom: 8 }}>Voz<span style={{ color: '#FE3D07' }}>It</span></h2>
          <p style={{ fontSize: 14 }}>No reports yet. Tap the camera to be first.</p>
        </div>
      </div>
      <NavBar active="feed" />
    </div>
  )
}
