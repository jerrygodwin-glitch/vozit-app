// @ts-nocheck
'use client'
import{useState}from'react'
import{useRouter}from'next/navigation'
import{ShareButton}from'@/components/share/ShareButton'
import{useAuth}from'@/hooks/useAuth'
import MuxPlayer from'@mux/mux-player-react'
const TC:Record<string,{c:string,bg:string,l:string}>={starter:{c:'#22C55E',bg:'#ECFDF5',l:'Starter'},silver:{c:'#94A3B8',bg:'#F0F4F8',l:'Silver'},gold:{c:'#EAB308',bg:'#FFF8E6',l:'Gold'},platinum:{c:'#8B5CF6',bg:'#F5F0FF',l:'Platinum'}}
export function ReportDetailClient({report:r,seriesReports}:{report:any,seriesReports:any[]}){const router=useRouter();const{user}=useAuth();const[voted,setVoted]=useState<'up'|'down'|null>(null);const[votes,setVotes]=useState({up:r.upvotes,down:r.downvotes});const t=TC[r.user?.tier||'starter']||TC.starter
const isOwner=user?.id===r.user_id
const otherParts=(seriesReports||[]).filter(sr=>sr.id!==r.id)
async function vote(d:'up'|'down'){if(voted===d)return;setVoted(d);setVotes(v=>({up:v.up+(d==='up'?1:0),down:v.down+(d==='down'?1:0)}));fetch('/api/votes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:r.id,value:d==='up'?1:-1})}).catch(()=>{})}
return(<div style={{background:'#fff',minHeight:'100vh'}}><div style={{background:'linear-gradient(to right,#f0e8d8,#b8d8f0 25%,#50b0e8 50%,#18a0e8 75%,#0a3ff1)',padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}><span onClick={()=>router.back()} style={{cursor:'pointer',color:'#fff',fontSize:18}}>{'\u2039'}</span><span style={{fontSize:14,fontWeight:600,color:'#fff',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.title}</span></div>
{r.playback_id?<MuxPlayer playbackId={r.playback_id} streamType="on-demand" metadata={{video_title:r.title,viewer_user_id:user?.id}} style={{width:'100%',aspectRatio:'16/9',background:'#0a1e30'}}/>:<div style={{height:200,background:'#0a1e30',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'rgba(255,255,255,0.2)'}}>Video processing...</span></div>}
<div style={{maxWidth:600,margin:'0 auto',padding:'14px 16px 60px'}}><h1 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',lineHeight:1.4,marginBottom:4}}>{r.title}</h1><div style={{fontSize:12,color:'#00AACC',fontWeight:500,marginBottom:12}}>{r.location_name} · {new Date(r.created_at).toLocaleDateString()}</div>
{r.description&&<p style={{fontSize:14,color:'#333',lineHeight:1.6,marginBottom:16}}>{r.description}</p>}
<div style={{background:'#fafafa',borderRadius:10,padding:14,marginBottom:16,border:'1px solid #f0f0f0'}}>{[{l:'WHO',v:r.who,c:'#B53D0F'},{l:'WHAT',v:r.what,c:'#1565C0'},{l:'WHERE',v:r.where_text||r.location_name,c:'#085041'},{l:'WHEN',v:r.when_happened?new Date(r.when_happened).toLocaleString():'',c:'#854F0B'},{l:'WHY',v:r.why,c:'#993556'}].map(w=>w.v?(<div key={w.l} style={{display:'flex',gap:10,marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:w.c,width:40,flexShrink:0}}>{w.l}</span><span style={{fontSize:13,color:'#333',lineHeight:1.4}}>{w.v}</span></div>):null)}</div>

{(otherParts.length>0||isOwner)&&<div style={{borderRadius:10,padding:14,marginBottom:16,border:'1px solid #f0f0f0'}}>
<div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:otherParts.length?8:0,textTransform:'uppercase',letterSpacing:0.5}}>{otherParts.length>0?`Ongoing story · ${seriesReports.length} updates`:'Ongoing story'}</div>
{seriesReports.map(sr=>(
<a key={sr.id} href={`/report/${sr.id}`} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',textDecoration:'none',fontSize:13,color:sr.id===r.id?'#1a1a1a':'#00AACC',fontWeight:sr.id===r.id?700:500}}>
<span style={{fontSize:10,color:'#aaa',width:14,flexShrink:0}}>{sr.series_part}</span>
<span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sr.title}</span>
{sr.id===r.id&&<span style={{fontSize:10,color:'#aaa'}}>(this one)</span>}
</a>
))}
{isOwner&&<a href={`/upload?update_to=${r.id}&update_to_title=${encodeURIComponent(r.title)}`} style={{display:'block',marginTop:otherParts.length?10:0,padding:'10px 12px',borderRadius:8,background:'#FEF3E6',border:'1px solid #FED7AA',textAlign:'center',fontSize:13,fontWeight:600,color:'#B53D0F',textDecoration:'none'}}>+ Post an update</a>}
</div>}

<div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 0',borderTop:'1px solid #f0f0f0',borderBottom:'1px solid #f0f0f0',marginBottom:14}}>
<div style={{width:36,height:36,borderRadius:18,background:t.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff'}}>{(r.user?.display_name||'?').slice(0,2).toUpperCase()}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1a1a1a'}}>@{r.user?.username} <span style={{fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,background:t.bg,color:t.c,marginLeft:4}}>{'\u2605'} {t.l}</span></div><div style={{fontSize:11,color:'#888'}}>{Math.round(r.credibility_pct||80)}% credibility</div></div>
<button onClick={()=>vote('up')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #eee',cursor:'pointer',fontSize:13,fontWeight:600,background:voted==='up'?'#ECFDF5':'#fff',color:voted==='up'?'#085041':'#333',fontFamily:'inherit'}}>{'\u25b2'} {votes.up}</button>
<button onClick={()=>vote('down')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #eee',cursor:'pointer',fontSize:13,fontWeight:600,background:voted==='down'?'#FEF2F2':'#fff',color:voted==='down'?'#DC2626':'#333',fontFamily:'inherit'}}>{'\u25bc'} {votes.down}</button>
</div>
<div style={{marginBottom:14}}><ShareButton reportId={r.id} title={r.title} location={r.location_name} username={r.user?.username}/></div>
</div></div>)}
