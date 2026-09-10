// @ts-nocheck
'use client'
import{useState,useEffect}from'react'
import{NavBar}from'@/components/ui/NavBar'
import{BRAND}from'@/lib/logo'

type Account={platform:string;account_id:string;username:string;connected:boolean}
type Platform={id:string;name:string;icon:string;description:string;oauthUrl?:string}

const PLATFORMS:Platform[]=[
  {id:'youtube',name:'YouTube',icon:'📺',description:'Upload reports as YouTube videos. Monetize via AdSense.',oauthUrl:'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUTUBE_CLIENT_ID&redirect_uri=REDIRECT&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly&access_type=offline'},
  {id:'tiktok',name:'TikTok',icon:'🎵',description:'Post reports as TikToks. Creator Fund eligible.',oauthUrl:'https://www.tiktok.com/v2/auth/authorize/?client_key=TIKTOK_CLIENT_KEY&response_type=code&scope=user.info.basic,video.publish&redirect_uri=REDIRECT'},
  {id:'instagram',name:'Instagram',icon:'📸',description:'Post as Instagram Reels via your connected Facebook.',oauthUrl:'https://www.facebook.com/v19.0/dialog/oauth?client_id=FB_APP_ID&redirect_uri=REDIRECT&scope=instagram_basic,instagram_content_publish,pages_show_list'},
  {id:'facebook',name:'Facebook',icon:'👤',description:'Post to your Facebook Page or profile.',oauthUrl:'https://www.facebook.com/v19.0/dialog/oauth?client_id=FB_APP_ID&redirect_uri=REDIRECT&scope=pages_manage_posts,pages_read_engagement,publish_video'},
  {id:'x',name:'X (Twitter)',icon:'𝕏',description:'Tweet reports with video. Revenue sharing eligible.',oauthUrl:'https://twitter.com/i/oauth2/authorize?client_id=X_CLIENT_ID&redirect_uri=REDIRECT&response_type=code&scope=tweet.write tweet.read users.read media.write offline.access'},
]

export default function SocialSettingsPage(){
const[accounts,setAccounts]=useState<Account[]>([])
const[loading,setLoading]=useState(true)
const[connecting,setConnecting]=useState<string|null>(null)

useEffect(()=>{
  fetch('/api/social').then(r=>r.json()).then(d=>{setAccounts(d.accounts||[]);setLoading(false)}).catch(()=>setLoading(false))
},[])

function isConnected(platformId:string){return accounts.some(a=>a.platform===platformId&&a.connected)}
function getAccount(platformId:string){return accounts.find(a=>a.platform===platformId)}

async function connectPlatform(platform:Platform){
  setConnecting(platform.id)
  // In production: redirect to OAuth URL, handle callback
  // For now: simulate connection
  const redirectUri=encodeURIComponent(`${window.location.origin}/api/social/callback`)
  const url=platform.oauthUrl?.replace('REDIRECT',redirectUri).replace('YOUTUBE_CLIENT_ID',process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID||'').replace('TIKTOK_CLIENT_KEY',process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY||'').replace('FB_APP_ID',process.env.NEXT_PUBLIC_FB_APP_ID||'').replace('X_CLIENT_ID',process.env.NEXT_PUBLIC_X_CLIENT_ID||'')
  if(url)window.location.href=url
  else{
    // Demo mode — simulate connect
    await fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect',platform:platform.id,access_token:'demo_token',username:'demo_user'})})
    setAccounts(a=>[...a.filter(x=>x.platform!==platform.id),{platform:platform.id,account_id:'demo',username:'demo_user',connected:true}])
    setConnecting(null)
  }
}

async function disconnectPlatform(platformId:string){
  await fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'disconnect',platform:platformId})})
  setAccounts(a=>a.map(x=>x.platform===platformId?{...x,connected:false}:x))
}

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<NavBar/>
<div style={{maxWidth:520,margin:'0 auto',padding:'80px 16px 100px'}}>
<h1 style={{fontSize:20,fontWeight:600,color:'#1a1a1a',marginBottom:4}}>Social accounts</h1>
<p style={{fontSize:13,color:'#888',marginBottom:20}}>Connect your accounts to cross-post reports and earn from every platform.</p>

{/* How it works */}
<div style={{background:'#EFF8FF',borderRadius:10,padding:14,marginBottom:20,border:'1px solid #d0e8ff'}}>
<div style={{fontSize:12,fontWeight:600,color:BRAND.blue,marginBottom:6}}>How cross-posting works</div>
<div style={{fontSize:12,color:'#555',lineHeight:1.6}}>When you publish a report, VozIt can automatically post it to your connected accounts. You keep 100% of the revenue from your own channels — this is a bonus on top of your VozIt tier earnings.</div>
</div>

{/* Platform list */}
{loading?<div style={{textAlign:'center',padding:20,color:'#888'}}>Loading...</div>:
PLATFORMS.map(p=>{
  const connected=isConnected(p.id)
  const account=getAccount(p.id)
  return(
  <div key={p.id} style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #eee',marginBottom:10,display:'flex',alignItems:'center',gap:14}}>
  <span style={{fontSize:28,width:36,textAlign:'center'}}>{p.icon}</span>
  <div style={{flex:1}}>
  <div style={{fontSize:14,fontWeight:600,color:'#1a1a1a'}}>{p.name}</div>
  <div style={{fontSize:12,color:'#888',marginTop:2}}>{p.description}</div>
  {connected&&account?.username&&<div style={{fontSize:11,color:BRAND.blue,marginTop:4}}>Connected as @{account.username}</div>}
  </div>
  {connected?(
  <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
  <span style={{fontSize:11,fontWeight:600,color:'#22C55E',background:'#ECFDF5',padding:'3px 8px',borderRadius:4}}>Connected</span>
  <button onClick={()=>disconnectPlatform(p.id)} style={{fontSize:10,color:'#888',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>Disconnect</button>
  </div>
  ):(
  <button onClick={()=>connectPlatform(p)} disabled={connecting===p.id} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #eee',background:'#fff',color:BRAND.blue,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:connecting===p.id?0.5:1}}>{connecting===p.id?'...':'Connect'}</button>
  )}
  </div>)
})}

{/* Auto-post toggle */}
<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #eee',marginTop:16}}>
<div style={{fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>Auto-post settings</div>
<div style={{fontSize:12,color:'#888',lineHeight:1.6}}>When enabled, every published report automatically gets posted to all your connected accounts. You can also manually distribute from the share menu on any report.</div>
</div>

<div style={{textAlign:'center',marginTop:16}}><a href="/settings" style={{color:BRAND.blue,fontSize:13,fontWeight:500,textDecoration:'none'}}>← Back to settings</a></div>
</div>
</div>)
}
