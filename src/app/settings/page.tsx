// @ts-nocheck
'use client'
import{useState,useEffect}from'react'
import{createBrowserClient}from'@/lib/supabase'
import{NavBar}from'@/components/ui/NavBar'
import{BRAND}from'@/lib/logo'
import{PAYOUT_PROVIDERS}from'@/lib/payouts'
import Link from'next/link'

export default function SettingsPage(){
const sb=createBrowserClient()
const[profile,setProfile]=useState<any>(null)
const[loading,setLoading]=useState(true)
const[saving,setSaving]=useState(false)
const[displayName,setDisplayName]=useState('')
const[bio,setBio]=useState('')
const[country,setCountry]=useState('')
const[saved,setSaved]=useState(false)

useEffect(()=>{
  sb.auth.getUser().then(({data:{user}})=>{
    if(!user)return
    sb.from('users').select('*').eq('id',user.id).single().then(({data})=>{
      setProfile(data);setDisplayName(data?.display_name||'');setBio(data?.bio||'');setCountry(data?.country||'');setLoading(false)
    })
  })
},[sb])

async function saveProfile(){
  setSaving(true)
  const{data:{user}}=await sb.auth.getUser()
  if(user){await sb.from('users').update({display_name:displayName,bio,country}).eq('id',user.id)}
  setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000)
}

const sections=[
  {icon:'👤',title:'Edit profile',desc:'Name, bio, country',action:()=>{},expandable:true},
  {icon:'📱',title:'Social accounts',desc:'Connect YouTube, TikTok, Instagram, Facebook, X',href:'/settings/social'},
  {icon:'💰',title:'Payout settings',desc:`${profile?.payout_provider?PAYOUT_PROVIDERS[profile.payout_provider as keyof typeof PAYOUT_PROVIDERS]?.name||profile.payout_provider:'Not configured'}`,href:'/payouts'},
  {icon:'📊',title:'Earnings',desc:'Revenue breakdown by report',href:'/earnings'},
  {icon:'🔔',title:'Notifications',desc:'Coming soon',disabled:true},
  {icon:'🔒',title:'Privacy & security',desc:'Coming soon',disabled:true},
]

const tierColors:Record<string,string>={starter:'#22C55E',silver:'#94A3B8',gold:'#EAB308',platinum:'#8B5CF6'}
const tierShares:Record<string,string>={starter:'50%',silver:'55%',gold:'65%',platinum:'70%'}

if(loading)return<div style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading...</p></div>

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<NavBar/>
<div style={{maxWidth:520,margin:'0 auto',padding:'80px 16px 100px'}}>
<h1 style={{fontSize:20,fontWeight:600,color:'#1a1a1a',marginBottom:20}}>Settings</h1>

{/* Profile edit inline */}
<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #eee',marginBottom:12}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
<div style={{width:48,height:48,borderRadius:24,background:`linear-gradient(135deg, ${tierColors[profile?.tier||'starter']}, ${tierColors[profile?.tier||'starter']}88)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:18,fontWeight:700}}>{(profile?.display_name||'?')[0].toUpperCase()}</div>
<div><div style={{fontSize:15,fontWeight:600,color:'#1a1a1a'}}>@{profile?.username}</div><div style={{fontSize:12,color:tierColors[profile?.tier||'starter'],fontWeight:500}}>★ {(profile?.tier||'starter').charAt(0).toUpperCase()+(profile?.tier||'starter').slice(1)} — {tierShares[profile?.tier||'starter']} share</div></div>
</div>
<div style={{display:'grid',gap:10}}>
<div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Display name</div><input value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/></div>
<div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Bio</div><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={2} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical'}}/></div>
<div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Country</div><input value={country} onChange={e=>setCountry(e.target.value)} placeholder="e.g. US, NG, UA" style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/></div>
<button onClick={saveProfile} disabled={saving} style={{padding:'8px 16px',borderRadius:8,border:'none',background:saved?'#22C55E':BRAND.blue,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{saved?'✓ Saved':saving?'Saving...':'Save changes'}</button>
</div>
</div>

{/* Settings sections */}
{sections.filter(s=>!s.expandable).map(s=>{
  const inner=(
  <div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #eee',marginBottom:8,display:'flex',alignItems:'center',gap:12,cursor:s.disabled?'default':'pointer',opacity:s.disabled?0.5:1}}>
  <span style={{fontSize:22,width:32,textAlign:'center'}}>{s.icon}</span>
  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:'#1a1a1a'}}>{s.title}</div><div style={{fontSize:12,color:'#888'}}>{s.desc}</div></div>
  {!s.disabled&&<span style={{color:'#ccc',fontSize:16}}>›</span>}
  </div>)
  return s.href&&!s.disabled?<Link key={s.title} href={s.href} style={{textDecoration:'none'}}>{inner}</Link>:<div key={s.title}>{inner}</div>
})}

{/* Sign out */}
<button onClick={async()=>{await fetch('/api/auth/signout',{method:'POST'});window.location.href='/auth/login'}} style={{width:'100%',marginTop:16,padding:12,borderRadius:12,border:'1px solid #eee',background:'#fff',color:'#991B1B',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Sign out</button>
</div>
</div>)
}
