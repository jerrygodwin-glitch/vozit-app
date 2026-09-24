// @ts-nocheck
'use client'
import{useState,useEffect,useRef}from'react'
import{useRouter}from'next/navigation'
import{createBrowserClient}from'@/lib/supabase'
import{VOZIT_LOGO}from'@/lib/logo'
const TYPES=[{id:'eyewitness',l:'Eyewitness',d:'On the ground, reporting what you see'},{id:'journalist',l:'Journalist',d:'Professional reporting background'},{id:'activist',l:'Advocate',d:'Amplifying voices and causes'},{id:'hobbyist',l:'Observer',d:'Curious citizen documenting life'}]
const TOPICS=['conflict','climate','protest','politics','health','infrastructure','culture','wildlife']
type Step='username'|'profile'|'topics'|'revenue'|'complete'
export default function P(){const router=useRouter();const sb=createBrowserClient();const[step,setStep]=useState<Step>('username');const[loading,setLoading]=useState(false);const[type,setType]=useState('');const[topics,setTopics]=useState<string[]>([]);const[optIn,setOptIn]=useState(false)

// Username step — mandatory for everyone (not just OAuth sign-ins) so
// there's one consistent, deliberately-chosen, unique identity that's used
// on video watermarks, rather than trusting whatever a DB trigger may have
// auto-generated from an email address.
const[username,setUsername]=useState('');const[originalUsername,setOriginalUsername]=useState('');const[usernameStatus,setUsernameStatus]=useState<'idle'|'checking'|'available'|'taken'|'invalid'>('idle');const[usernameNote,setUsernameNote]=useState('');const[usernameErr,setUsernameErr]=useState('');const checkTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
useEffect(()=>{(async()=>{const{data:{user}}=await sb.auth.getUser();if(!user)return;const{data}=await sb.from('users').select('username').eq('id',user.id).single();const u=data?.username||'';setUsername(u);setOriginalUsername(u)})()},[])
useEffect(()=>{
  if(checkTimer.current)clearTimeout(checkTimer.current)
  if(!username.trim()){setUsernameStatus('idle');return}
  if(username===originalUsername){setUsernameStatus('available');setUsernameNote('This is your current username');return}
  setUsernameStatus('checking')
  checkTimer.current=setTimeout(async()=>{
    try{
      const res=await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      const d=await res.json()
      if(!d.available&&d.reason){setUsernameStatus('invalid');setUsernameNote(d.reason)}
      else if(d.available){setUsernameStatus('available');setUsernameNote('')}
      else{setUsernameStatus('taken');setUsernameNote('')}
    }catch{setUsernameStatus('idle')}
  },400)
  return()=>{if(checkTimer.current)clearTimeout(checkTimer.current)}
},[username,originalUsername])
async function saveUsername(){
  setLoading(true);setUsernameErr('')
  try{
    const res=await fetch('/api/auth/set-username',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})})
    const d=await res.json()
    if(!res.ok){setUsernameErr(d.error||'Could not save username');return}
    setStep('profile')
  }catch(e:any){setUsernameErr(e.message)}finally{setLoading(false)}
}

async function saveProfile(){setLoading(true);try{const{data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('users').update({reporter_type:type}).eq('id',user.id);setStep('topics')}finally{setLoading(false)}}
async function saveTopics(){setLoading(true);try{const{data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('users').update({topics}).eq('id',user.id);setStep('revenue')}finally{setLoading(false)}}
// Just a preference flag here — matches how YouTube/Twitch/Patreon handle
// this (registration stays fast; actual provider + account details are
// collected later, on the Payouts page, only once there's real money to
// set up for). Asking for bank/wallet details this early measurably hurts
// signup completion for the majority who haven't earned anything yet.
async function saveRevenue(){setLoading(true);try{const{data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('users').update({revenue_enabled:optIn}).eq('id',user.id);setStep('complete')}finally{setLoading(false)}}
const cs={p:{minHeight:'100vh',background:'#f5f5f5',display:'flex'as const,alignItems:'center'as const,justifyContent:'center'as const,padding:24},c:{maxWidth:440,width:'100%'},o:{padding:12,borderRadius:10,border:'1px solid #eee',background:'#fff',cursor:'pointer',marginBottom:8,color:'#333',fontSize:13,transition:'border-color 0.15s'}}
if(step==='username')return(<div style={cs.p}><div className='card' style={{...cs.c,padding:28}}><div style={{textAlign:'center',marginBottom:20}}><img src={VOZIT_LOGO} alt='VozIt' style={{height:48,width:48,borderRadius:10,margin:'0 auto 8px'}}/></div><h2 style={{color:'#1a1a1a',fontSize:18,marginBottom:4}}>Choose your username</h2><p style={{color:'#888',fontSize:12,marginBottom:16}}>This is how you'll appear on VozIt — including on your video watermarks</p>
{usernameErr&&<div style={{background:'#FEF2F2',color:'#DC2626',padding:10,borderRadius:8,fontSize:12,marginBottom:12}}>{usernameErr}</div>}
<input value={username} onChange={e=>setUsername(e.target.value)} placeholder='Username' style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #ddd',fontSize:14,outline:'none',fontFamily:'inherit',marginBottom:4}}/>
<div style={{minHeight:18,marginBottom:16,fontSize:11}}>
{usernameStatus==='checking'&&<span style={{color:'#999'}}>Checking availability...</span>}
{usernameStatus==='available'&&<span style={{color:'#22C55E'}}>✓ {usernameNote||'Available'}</span>}
{usernameStatus==='taken'&&<span style={{color:'#DC2626'}}>✗ Already taken</span>}
{usernameStatus==='invalid'&&<span style={{color:'#DC2626'}}>{usernameNote}</span>}
</div>
<button onClick={saveUsername} disabled={usernameStatus!=='available'||loading} className='btn-primary' style={{width:'100%',opacity:usernameStatus==='available'?1:0.5}}>{loading?'...':'Continue'}</button>
</div></div>)
if(step==='profile')return(<div style={cs.p}><div className='card' style={{...cs.c,padding:28}}><div style={{textAlign:'center',marginBottom:20}}><img src={VOZIT_LOGO} alt='VozIt' style={{height:48,width:48,borderRadius:10,margin:'0 auto 8px'}}/></div><h2 style={{color:'#1a1a1a',fontSize:18,marginBottom:4}}>What kind of reporter?</h2><p style={{color:'#888',fontSize:12,marginBottom:16}}>This helps us match you with assignments</p>{TYPES.map(t=>(<div key={t.id} onClick={()=>setType(t.id)} style={{...cs.o,borderColor:type===t.id?'#FE3D07':'#eee',background:type===t.id?'#FEF3E6':'#fff'}}><div style={{fontWeight:600}}>{t.l}</div><div style={{fontSize:11,color:'#888',marginTop:2}}>{t.d}</div></div>))}<button onClick={saveProfile} disabled={!type||loading} className='btn-primary' style={{width:'100%',opacity:type?1:0.5,marginTop:8}}>{loading?'...':'Continue'}</button></div></div>)
if(step==='topics')return(<div style={cs.p}><div className='card' style={{...cs.c,padding:28}}><h2 style={{color:'#1a1a1a',fontSize:18,marginBottom:4}}>Topics you cover</h2><p style={{color:'#888',fontSize:12,marginBottom:16}}>Select all that apply</p><div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>{TOPICS.map(t=>(<span key={t} onClick={()=>setTopics(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t])} style={{...cs.o,display:'inline-block',width:'auto',borderColor:topics.includes(t)?'#FE3D07':'#eee',background:topics.includes(t)?'#FEF3E6':'#fff',marginBottom:0,padding:'8px 14px',borderRadius:20}}>{t}</span>))}</div><button onClick={saveTopics} disabled={loading} className='btn-primary' style={{width:'100%'}}>{loading?'...':'Continue'}</button></div></div>)
if(step==='revenue')return(<div style={cs.p}><div className='card' style={{...cs.c,padding:28}}><h2 style={{color:'#1a1a1a',fontSize:18,marginBottom:4}}>Earn for your reporting</h2><p style={{color:'#888',fontSize:13,marginBottom:16}}>VozIt shares revenue — you keep up to 70%.</p>
<div onClick={()=>setOptIn(!optIn)} style={{...cs.o,borderColor:optIn?'#22C55E':'#eee',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontWeight:600}}>{optIn?'Revenue enabled ✓':'Join revenue program'}</span><div style={{width:44,height:24,borderRadius:12,background:optIn?'#22C55E':'#ddd',position:'relative',transition:'background 0.2s'}}><div style={{width:18,height:18,borderRadius:9,background:'white',position:'absolute',top:3,left:optIn?23:3,transition:'left 0.2s'}}/></div></div>
{optIn&&<div style={{padding:14,background:'#fafafa',borderRadius:10,border:'1px solid #f0f0f0',marginTop:12,marginBottom:16}}>
<div style={{fontSize:12,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>Revenue Tiers</div>
{[{l:'Starter',c:'#22C55E',r:'50%',req:'0–25 reports'},{l:'Silver',c:'#94A3B8',r:'55%',req:'26–100, 80%+ credibility'},{l:'Gold',c:'#EAB308',r:'65%',req:'101–499, 90%+ credibility'},{l:'Platinum',c:'#8B5CF6',r:'70%',req:'500+, 95%+ credibility'}].map(t=>(<div key={t.l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><div style={{width:8,height:8,borderRadius:4,background:t.c,flexShrink:0}}/><span style={{flex:1,fontSize:12,fontWeight:600}}>{t.l}</span><span style={{fontSize:10,color:'#888'}}>{t.req}</span><span style={{fontSize:12,fontWeight:700,color:t.c,minWidth:32,textAlign:'right'}}>{t.r}</span></div>))}
<div style={{fontSize:10,color:'#999',textAlign:'center',marginTop:8,paddingTop:8,borderTop:'1px solid #eee'}}>No fees — VozIt absorbs all payout costs</div>
<div style={{fontSize:11,color:'#0a8fe8',textAlign:'center',marginTop:10}}>You'll pick a payout method and enter your details later, from Settings → Payouts, whenever you're ready to withdraw.</div>
</div>}
<button onClick={saveRevenue} className='btn-primary' style={{width:'100%',marginTop:12}}>{optIn?'Continue':'Skip for now'}</button>
</div></div>)
return(<div style={cs.p}><div className='card' style={{...cs.c,padding:28,textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>{'\u2705'}</div><h2 style={{color:'#1a1a1a',fontSize:18,marginBottom:8}}>You{"'"}re ready!</h2><p style={{color:'#888',fontSize:13,marginBottom:16}}>Start reporting what you witness.</p><button onClick={()=>router.push('/feed')} className='btn-primary' style={{width:'100%'}}>Go to feed</button></div></div>)}
