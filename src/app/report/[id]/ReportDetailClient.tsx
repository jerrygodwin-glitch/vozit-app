// @ts-nocheck
'use client'
import{useState,useRef,useEffect}from'react'
import{useRouter}from'next/navigation'
import{ShareButton}from'@/components/share/ShareButton'
import{useAuth}from'@/hooks/useAuth'
import MuxPlayer from'@mux/mux-player-react'
import{getCrisisResource}from'@/lib/crisis-resources'
const TC:Record<string,{c:string,bg:string,l:string}>={starter:{c:'#22C55E',bg:'#ECFDF5',l:'Starter'},silver:{c:'#94A3B8',bg:'#F0F4F8',l:'Silver'},gold:{c:'#EAB308',bg:'#FFF8E6',l:'Gold'},platinum:{c:'#8B5CF6',bg:'#F5F0FF',l:'Platinum'}}

// Same 7-position drift pattern + 3-layer design already specced out for
// the server-side burned-in pipeline in src/lib/watermark.ts (which never
// actually runs — see processVideoWatermark). Reproduced here as a live
// playback overlay so viewers get the identical visual experience without
// needing that infrastructure.
const FLOAT_POSITIONS=[
  {left:'8%',top:'15%'},{right:'10%',top:'22%'},{left:'15%',top:'40%'},
  {right:'6%',top:'45%'},{left:'40%',top:'12%'},{left:'30%',top:'38%'},{right:'22%',top:'18%'},
]

export function ReportDetailClient({report:r,seriesReports,viewerCountry}:{report:any,seriesReports:any[],viewerCountry?:string|null}){const router=useRouter();const{user}=useAuth();const[voted,setVoted]=useState<'up'|'down'|null>(null);const[votes,setVotes]=useState({up:r.upvotes,down:r.downvotes});const t=TC[r.user?.tier||'starter']||TC.starter
const crisisResource=r.show_crisis_resources?getCrisisResource(viewerCountry):null

// On-demand translation — never touches the original fields, purely a
// read-side view for a viewer who doesn't share the reporter's language.
// Target language comes from the viewer's own browser, not the report's.
const[translation,setTranslation]=useState<{title:string,who:string,what:string,where_text:string,why:string,transcript:string}|null>(null)
const[showTranslation,setShowTranslation]=useState(false)
const[translating,setTranslating]=useState(false)
const[translateError,setTranslateError]=useState('')
async function loadTranslation(){
  if(translation){setShowTranslation(true);return}
  setTranslating(true);setTranslateError('')
  try{
    const lang=(navigator.language||'en').split('-')[0]
    const res=await fetch(`/api/reports/translate?report_id=${r.id}&lang=${lang}`)
    const d=await res.json()
    if(!res.ok){setTranslateError(d.error||'Translation unavailable right now');return}
    setTranslation(d.translation);setShowTranslation(true)
  }catch(e:any){setTranslateError(e.message)}
  setTranslating(false)
}
const displayTitle=showTranslation&&translation?.title||r.title
const displayWho=showTranslation?translation?.who||'':r.who
const displayWhat=showTranslation?translation?.what||'':r.what
const displayWhere=showTranslation?translation?.where_text||'':(r.where_text||r.location_name)
const displayWhy=showTranslation?translation?.why||'':r.why
const playerRef=useRef<any>(null)
const adVideoRef=useRef<HTMLVideoElement>(null)
const[currentTime,setCurrentTime]=useState(0)
const[duration,setDuration]=useState(0)
const[showEndCard,setShowEndCard]=useState(false)

// Mid-roll ad break at ~45s — client-side insertion (not full server-side
// ad insertion), since VozIt's video runs on Mux, not an AWS-based stack.
// Only fetched/shown for clips long enough that a break makes sense.
const[adUrl,setAdUrl]=useState<string|null>(null)
const[adState,setAdState]=useState<'idle'|'playing'|'done'>('idle')
useEffect(()=>{
  fetch('/api/ads/get-ad').then(res=>res.json()).then(d=>{if(d.ad?.videoUrl)setAdUrl(d.ad.videoUrl)}).catch(()=>{})
},[])

useEffect(()=>{
  const el=playerRef.current
  if(!el)return
  const onTime=()=>{
    const ct=el.currentTime||0,dur=el.duration||0
    setCurrentTime(ct)
    if(dur)setDuration(dur)
    setShowEndCard(dur>0&&ct>=dur-1.5)
    if(adState==='idle'&&adUrl&&dur>50&&ct>=45){
      setAdState('playing')
      el.pause()
    }
  }
  const onEnded=()=>setShowEndCard(true)
  el.addEventListener('timeupdate',onTime)
  el.addEventListener('loadedmetadata',onTime)
  el.addEventListener('ended',onEnded)
  return()=>{
    el.removeEventListener('timeupdate',onTime)
    el.removeEventListener('loadedmetadata',onTime)
    el.removeEventListener('ended',onEnded)
  }
},[r.playback_id,adUrl,adState])

function onAdEnded(){
  fetch('/api/ads/impression',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:r.id,ad_network:'configured',completed:true})}).catch(()=>{})
  setAdState('done')
  playerRef.current?.play?.()
}
const floatPos=FLOAT_POSITIONS[Math.floor(currentTime/4)%FLOAT_POSITIONS.length]

// Gore never holds or removes the report (NEWSWORTHY_CATEGORIES in
// hive-moderation.ts) — instead the player blurs a short window around
// each flagged second, reusing the timeupdate-driven currentTime above.
// Combat/protest footage publishes and plays completely normally outside
// these windows.
const[goreRevealed,setGoreRevealed]=useState(false)
const goreWindows=(r.gore_timestamps||[]).map((ts:number)=>[ts-1,ts+2])
const inGoreWindow=goreWindows.some(([s,e]:number[])=>currentTime>=s&&currentTime<=e)
const isOwner=user?.id===r.user_id
const otherParts=(seriesReports||[]).filter(sr=>sr.id!==r.id)
async function vote(d:'up'|'down'){if(voted===d)return;setVoted(d);setVotes(v=>({up:v.up+(d==='up'?1:0),down:v.down+(d==='down'?1:0)}));fetch('/api/votes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:r.id,value:d==='up'?1:-1})}).catch(()=>{})}

// Multi-reporter corroboration — independent reports near the same place/time
const[corroboration,setCorroboration]=useState<{count:number,corroborating:any[]}>({count:0,corroborating:[]})
useEffect(()=>{
  fetch(`/api/reports/corroboration?report_id=${r.id}`).then(res=>res.json()).then(d=>setCorroboration({count:d.count||0,corroborating:d.corroborating||[]})).catch(()=>{})
},[r.id])

// Community "flag as fake/misleading/explicit/hateful" — separate from
// up/downvotes. Flags never hold or remove a report themselves; they're a
// visible "buyer beware" signal (loadFlagCounts below), backstopping
// whatever Hive wasn't confident enough to act on alone.
const FLAG_REASON_LABELS:Record<string,string>={fake_or_ai_generated:'fake or AI-generated',recycled_footage:'recycled footage',wrong_location_or_time:'the wrong location or time',explicit_content:'explicit',hateful_content:'hateful',other:'a problem'}
const[showFlagMenu,setShowFlagMenu]=useState(false)
const[flagged,setFlagged]=useState(false)
const[flagMsg,setFlagMsg]=useState('')
const[flagCounts,setFlagCounts]=useState<{reason:string,count:number}[]>([])
function loadFlagCounts(){
  fetch(`/api/reports/flag?report_id=${r.id}`).then(res=>res.json()).then(d=>setFlagCounts(d.counts||[])).catch(()=>{})
}
useEffect(()=>{loadFlagCounts()},[r.id])
async function flag(reason:string){
  try{
    const res=await fetch('/api/reports/flag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:r.id,reason})})
    const d=await res.json()
    if(!res.ok){setFlagMsg(d.error||'Could not flag this report');return}
    setFlagged(true);setShowFlagMenu(false);setFlagMsg('Thanks — this helps other viewers.')
    loadFlagCounts()
  }catch(e:any){setFlagMsg(e.message)}
}

// Field notes — structured (category + substantiation), never an
// open box, and filtered by community rating rather than a moderator.
const FN_CATEGORIES=[
  {v:'confirms_location',l:'I can confirm this location'},
  {v:'contradicts',l:'I have information that contradicts this'},
  {v:'nearby_witness',l:"I was nearby — here's what I saw"},
  {v:'additional_context',l:'Additional context'},
]
const[fieldNotes,setFieldNotes]=useState<{visible:any[],hidden:any[],hiddenCount:number}>({visible:[],hidden:[],hiddenCount:0})
const[showAddFieldNote,setShowAddFieldNote]=useState(false)
const[showHiddenNotes,setShowHiddenNotes]=useState(false)
const[fnCategory,setFnCategory]=useState('')
const[fnContent,setFnContent]=useState('')
const[fnSubmitting,setFnSubmitting]=useState(false)
const[fnError,setFnError]=useState('')

async function loadFieldNotes(){
  try{const res=await fetch(`/api/field-notes?report_id=${r.id}`);const d=await res.json();setFieldNotes({visible:d.visible||[],hidden:d.hidden||[],hiddenCount:d.hiddenCount||0})}catch{}
}
useEffect(()=>{loadFieldNotes()},[r.id])

const accountAgeDays=user?.created_at?(Date.now()-new Date(user.created_at).getTime())/86400000:0
const FIELD_NOTE_WINDOW_HOURS=48
const hoursSincePublish=(Date.now()-new Date(r.created_at).getTime())/3600000
const fieldNoteWindowOpen=hoursSincePublish<=FIELD_NOTE_WINDOW_HOURS
const fieldNoteEligible=accountAgeDays>=7&&fieldNoteWindowOpen

async function submitFieldNote(){
  if(!fnCategory||fnContent.trim().length<30)return
  setFnSubmitting(true);setFnError('')
  try{
    const res=await fetch('/api/field-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:r.id,category:fnCategory,content:fnContent.trim()})})
    const d=await res.json()
    if(!res.ok){setFnError(d.error||'Could not post this field note');return}
    setFnCategory('');setFnContent('');setShowAddFieldNote(false)
    await loadFieldNotes()
  }catch(e:any){setFnError(e.message)}
  setFnSubmitting(false)
}

async function rateFieldNote(id:string,helpful:boolean){
  try{
    await fetch('/api/field-notes/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({field_note_id:id,helpful})})
    await loadFieldNotes()
  }catch{}
}

// Confirmed/contradicted badges — symmetric treatment on purpose (both
// sides of a dispute get equal visibility, not just the negative one).
// Recomputed live from the same visible notes already fetched above, so a
// badge disappears on its own if the note it was based on later gets
// buried by its own ratings — never a sticky, permanent mark on the report.
const WELL_RATED_MIN_RATINGS=5,WELL_RATED_RATIO=0.6
function isWellRated(n:any){return n.total_ratings>=WELL_RATED_MIN_RATINGS&&(n.helpful_count/n.total_ratings)>=WELL_RATED_RATIO}
const confirmedBadge=fieldNotes.visible.some((n:any)=>n.category==='confirms_location'&&isWellRated(n))
const contradictedBadge=fieldNotes.visible.some((n:any)=>n.category==='contradicts'&&isWellRated(n))
return(<div style={{background:'#fff',minHeight:'100vh'}}><div style={{background:'linear-gradient(to right,#f0e8d8,#b8d8f0 25%,#50b0e8 50%,#18a0e8 75%,#0a3ff1)',padding:'10px 16px',display:'flex',alignItems:'center',gap:12}}><span onClick={()=>router.back()} style={{cursor:'pointer',color:'#fff',fontSize:18}}>{'\u2039'}</span><span style={{fontSize:14,fontWeight:600,color:'#fff',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.title}</span></div>
{r.playback_id?<div style={{position:'relative',overflow:'hidden'}}>
  <MuxPlayer ref={playerRef} playbackId={r.playback_id} streamType="on-demand" preload="metadata" poster={r.thumbnail_url||undefined} metadata={{video_title:r.title,viewer_user_id:user?.id}} style={{width:'100%',aspectRatio:'16/9',background:'#0a1e30'}}/>

  {/* Mid-roll ad break — pauses the report at ~45s, plays a short ad,
      then resumes. Non-skippable by design at this length. */}
  {adState==='playing'&&adUrl&&<div style={{position:'absolute',inset:0,background:'#000',display:'flex',flexDirection:'column'}}>
    <video ref={adVideoRef} src={adUrl} autoPlay playsInline onEnded={onAdEnded} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    <span style={{position:'absolute',top:8,right:10,fontSize:10,color:'rgba(255,255,255,0.6)',background:'rgba(0,0,0,0.4)',padding:'2px 8px',borderRadius:4}}>Ad</span>
  </div>}

  {/* Graphic content (gore) — blurred at playback only, never removed or
      held. The underlying video is untouched (playback keeps running
      behind the blur), so a tap-to-reveal doesn't need to seek or reload
      anything — just lifts this overlay for the rest of the viewing. */}
  {inGoreWindow&&!goreRevealed&&<div onClick={()=>setGoreRevealed(true)} style={{position:'absolute',inset:0,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
    <div style={{textAlign:'center',padding:'10px 18px',borderRadius:8,background:'rgba(0,0,0,0.5)'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>⚠ Graphic content</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:2}}>Tap to view</div>
    </div>
  </div>}

  {/* Layer 1 — persistent bottom bar */}
  <div style={{position:'absolute',bottom:0,left:0,right:0,height:'8%',minHeight:28,background:'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',display:'flex',alignItems:'center',padding:'0 10px',pointerEvents:'none'}}>
    <span style={{fontSize:12,fontWeight:700,color:'#FE3D07'}}>VozIt!</span>
    <span style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginLeft:6}}>· @{r.user?.username} · I was there...</span>
    <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:'#fff'}}>{'★'} {t.l}</span>
  </div>

  {/* Layer 2 — floating stamp, drifts to a new position every 4s
      (anti-scraping: hard to crop out consistently) */}
  {!showEndCard&&<div style={{position:'absolute',...floatPos,padding:'3px 8px',borderRadius:4,background:'rgba(254,61,7,0.18)',pointerEvents:'none',transition:'top 0.6s ease,left 0.6s ease,right 0.6s ease'}}>
    <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>VozIt! — I was there...</span>
  </div>}

  {/* Layer 3 — end card bumper, last 1.5s */}
  {showEndCard&&<div style={{position:'absolute',inset:0,background:'#FE3D07',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',animation:'vzEndCardIn 0.4s ease',pointerEvents:'none'}}>
    <div style={{fontSize:32,fontWeight:800,color:'#fff',animation:'vzEndCardScale 0.5s ease'}}>VozIt!</div>
    <div style={{fontSize:15,fontStyle:'italic',color:'rgba(255,255,255,0.92)',marginTop:6,animation:'vzEndCardFade 0.6s ease 0.2s both'}}>I was there...</div>
    <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:10,animation:'vzEndCardFade 0.6s ease 0.35s both'}}>vozit.app</div>
  </div>}
  <style>{`
    @keyframes vzEndCardIn{from{opacity:0}to{opacity:1}}
    @keyframes vzEndCardScale{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes vzEndCardFade{from{opacity:0}to{opacity:1}}
  `}</style>
</div>:<div style={{height:200,background:'#0a1e30',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'rgba(255,255,255,0.2)'}}>Video processing...</span></div>}
<div style={{maxWidth:600,margin:'0 auto',padding:'14px 16px 60px'}}><h1 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',lineHeight:1.4,marginBottom:4}}>{displayTitle}</h1><div style={{fontSize:12,color:'#00AACC',fontWeight:500,marginBottom:12,display:'flex',alignItems:'center',gap:8}}><span>{r.location_name} · {new Date(r.created_at).toLocaleDateString()}</span>
<button onClick={()=>showTranslation?setShowTranslation(false):loadTranslation()} disabled={translating} style={{fontSize:11,color:'#999',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',padding:0}}>{translating?'Translating…':showTranslation?'Show original':'🌐 See translation'}</button>
</div>
{translateError&&<div style={{fontSize:11,color:'#DC2626',marginBottom:8}}>{translateError}</div>}

{crisisResource&&<div style={{borderRadius:10,padding:'12px 14px',marginBottom:16,background:'#F5F0FF',border:'1px solid #D9C8FA'}}>
<div style={{fontSize:12,fontWeight:700,color:'#4C1D95',marginBottom:4}}>If you or someone in this video needs support</div>
<div style={{fontSize:13,color:'#4C1D95',fontWeight:600}}>{crisisResource.name} — {crisisResource.contact}</div>
{crisisResource.note&&<div style={{fontSize:11,color:'#5B21B6',marginTop:2}}>{crisisResource.note}</div>}
<a href={crisisResource.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#7C3AED',textDecoration:'underline'}}>{crisisResource.url.replace('https://','')}</a>
</div>}

{r.description&&<p style={{fontSize:14,color:'#333',lineHeight:1.6,marginBottom:16}}>{r.description}</p>}
<div style={{background:'#fafafa',borderRadius:10,padding:14,marginBottom:16,border:'1px solid #f0f0f0'}}>{[{l:'WHO',v:displayWho,c:'#B53D0F'},{l:'WHAT',v:displayWhat,c:'#1565C0'},{l:'WHERE',v:displayWhere,c:'#085041'},{l:'WHEN',v:r.when_happened?new Date(r.when_happened).toLocaleString():'',c:'#854F0B'},{l:'WHY',v:displayWhy,c:'#993556'}].map(w=>w.v?(<div key={w.l} style={{display:'flex',gap:10,marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:w.c,width:40,flexShrink:0}}>{w.l}</span><span style={{fontSize:13,color:'#333',lineHeight:1.4}}>{w.v}</span></div>):null)}</div>

{showTranslation&&translation?.transcript&&<div style={{borderRadius:10,padding:14,marginBottom:16,border:'1px solid #f0f0f0'}}>
<div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Translated transcript</div>
<div style={{fontSize:13,color:'#333',lineHeight:1.6}}>{translation.transcript}</div>
</div>}

{corroboration.count>0&&<div style={{borderRadius:10,padding:'10px 14px',marginBottom:16,background:'#ECFDF5',border:'1px solid #A7F3D0'}}>
<div style={{fontSize:12,fontWeight:700,color:'#065F46',marginBottom:corroboration.count?4:0}}>✓ Corroborated by {corroboration.count} other report{corroboration.count===1?'':'s'}</div>
<div style={{fontSize:11,color:'#065F46'}}>Independent reporters filed video near this same place and time.</div>
</div>}

{/* Confirmed/contradicted — both derived live from Field Notes ratings,
    same threshold, same neutral tone. Can both show at once: that's the
    honest "all-source" outcome when the community itself is split. */}
{confirmedBadge&&<div style={{borderRadius:10,padding:'10px 14px',marginBottom:16,background:'#ECFDF5',border:'1px solid #A7F3D0'}}>
<div style={{fontSize:12,fontWeight:700,color:'#065F46'}}>✓ Confirmed by community</div>
<div style={{fontSize:11,color:'#065F46'}}>A well-rated Field Note confirms this location. See notes below.</div>
</div>}
{contradictedBadge&&<div style={{borderRadius:10,padding:'10px 14px',marginBottom:16,background:'#FEF3E6',border:'1px solid #FED7AA'}}>
<div style={{fontSize:12,fontWeight:700,color:'#92400E'}}>⚠ Contradicted by community</div>
<div style={{fontSize:11,color:'#92400E'}}>A well-rated Field Note disputes this report. See notes below.</div>
</div>}

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

<div style={{marginBottom:20}}>
{flagged||flagMsg?<div style={{fontSize:12,color:'#666',textAlign:'center'}}>{flagMsg}</div>:showFlagMenu?(
<div style={{border:'1px solid #eee',borderRadius:10,padding:12}}>
<div style={{fontSize:12,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>What's the concern?</div>
{[{v:'fake_or_ai_generated',l:'Looks AI-generated / deepfake'},{v:'recycled_footage',l:'Old footage passed off as new'},{v:'wrong_location_or_time',l:'Wrong location or time'},{v:'explicit_content',l:'Explicit or inappropriate content'},{v:'hateful_content',l:'Hateful or discriminatory content'},{v:'other',l:'Other'}].map(o=>(
<button key={o.v} onClick={()=>flag(o.v)} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:8,border:'1px solid #eee',background:'#fff',color:'#333',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:6}}>{o.l}</button>
))}
<button onClick={()=>setShowFlagMenu(false)} style={{fontSize:11,color:'#888',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
</div>
):(
<button onClick={()=>setShowFlagMenu(true)} style={{fontSize:11,color:'#999',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>🚩 Flag this report</button>
)}
{flagCounts.length>0&&<div style={{fontSize:11,color:'#999',textAlign:'center',marginTop:8}}>
{flagCounts.map((f,i)=>(<span key={f.reason}>{i>0&&' · '}{f.count} flagged this as {FLAG_REASON_LABELS[f.reason]||f.reason}</span>))}
</div>}
</div>

{/* Field notes — available on every report, not just flagged ones.
    Sorted by community helpfulness rating, not chronologically. */}
<div style={{borderTop:'1px solid #f0f0f0',paddingTop:16}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:'#1a1a1a'}}>Field Notes {fieldNotes.visible.length>0&&`(${fieldNotes.visible.length})`}</div>
<div style={{fontSize:10,color:'#999',marginTop:2}}>{fieldNoteWindowOpen?`Open for ${Math.max(0,Math.ceil(FIELD_NOTE_WINDOW_HOURS-hoursSincePublish))} more hour${Math.ceil(FIELD_NOTE_WINDOW_HOURS-hoursSincePublish)===1?'':'s'}`:'Window closed — follow-ups can still be posted as a new report'}</div>
</div>
{user&&!showAddFieldNote&&<button onClick={()=>setShowAddFieldNote(true)} style={{fontSize:11,fontWeight:600,color:'#0a8fe8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>+ Add a field note</button>}
</div>

{showAddFieldNote&&(
<div style={{border:'1px solid #eee',borderRadius:10,padding:12,marginBottom:12,background:'#fafafa'}}>
{!fieldNoteEligible?(
<div style={{fontSize:12,color:'#92400E',background:'#FEF3E6',border:'1px solid #FED7AA',borderRadius:8,padding:10}}>
{!fieldNoteWindowOpen
  ?`Field notes closed ${FIELD_NOTE_WINDOW_HOURS} hours after this report published, to keep focus on breaking developments. You can still post a follow-up video or update instead.`
  :`Field notes require an account at least 7 days old (yours is ${Math.max(0,Math.floor(accountAgeDays))} day${Math.floor(accountAgeDays)===1?'':'s'} old) — this helps keep field notes credible.`}
<div><button onClick={()=>setShowAddFieldNote(false)} style={{marginTop:8,fontSize:11,color:'#92400E',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>Close</button></div>
</div>
):(<>
<div style={{fontSize:12,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>What kind of field note is this?</div>
{FN_CATEGORIES.map(c=>(
<button key={c.v} onClick={()=>setFnCategory(c.v)} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:8,border:fnCategory===c.v?'2px solid #0a8fe8':'1px solid #eee',background:fnCategory===c.v?'#EFF6FF':'#fff',color:'#333',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:6}}>{c.l}</button>
))}
{fnCategory&&<>
<textarea value={fnContent} onChange={e=>setFnContent(e.target.value)} placeholder="Explain what you know — be specific." rows={3} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #ddd',fontSize:12,fontFamily:'inherit',resize:'vertical',marginTop:4}}/>
<div style={{fontSize:10,color:fnContent.trim().length>=30?'#22C55E':'#999',marginTop:4,marginBottom:8}}>{fnContent.trim().length}/30 characters minimum</div>
{fnError&&<div style={{fontSize:11,color:'#DC2626',marginBottom:8}}>{fnError}</div>}
<div style={{display:'flex',gap:8}}>
<button onClick={submitFieldNote} disabled={fnSubmitting||fnContent.trim().length<30} style={{flex:1,padding:8,borderRadius:8,border:'none',background:'#0a8fe8',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(fnSubmitting||fnContent.trim().length<30)?0.5:1}}>{fnSubmitting?'Posting...':'Post field note'}</button>
<button onClick={()=>{setShowAddFieldNote(false);setFnCategory('');setFnContent('');setFnError('')}} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #ddd',background:'#fff',color:'#666',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
</div>
</>}
</>)}
</div>
)}

{fieldNotes.visible.length===0&&!showAddFieldNote&&<div style={{fontSize:12,color:'#999',textAlign:'center',padding:'12px 0'}}>No field notes yet.</div>}

{fieldNotes.visible.map(n=>(
<div key={n.id} style={{border:'1px solid #eee',borderRadius:10,padding:12,marginBottom:8}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:'#EFF6FF',color:'#0a8fe8'}}>{FN_CATEGORIES.find(c=>c.v===n.category)?.l||n.category}</span>
</div>
<div style={{fontSize:13,color:'#333',lineHeight:1.5,marginBottom:8}}>{n.content}</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:11,color:'#888',flex:1}}>@{n.user?.username||'reporter'}</span>
<button onClick={()=>rateFieldNote(n.id,true)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #eee',background:n.my_rating===true?'#ECFDF5':'#fff',color:n.my_rating===true?'#085041':'#666',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>👍 Helpful {n.helpful_count>0&&`(${n.helpful_count})`}</button>
<button onClick={()=>rateFieldNote(n.id,false)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #eee',background:n.my_rating===false?'#FEF2F2':'#fff',color:n.my_rating===false?'#DC2626':'#666',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>👎 Not helpful {n.not_helpful_count>0&&`(${n.not_helpful_count})`}</button>
</div>
</div>
))}

{fieldNotes.hiddenCount>0&&(
<div style={{marginTop:8}}>
<button onClick={()=>setShowHiddenNotes(s=>!s)} style={{fontSize:11,color:'#999',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{showHiddenNotes?'Hide':'Show'} {fieldNotes.hiddenCount} note{fieldNotes.hiddenCount===1?'':'s'} hidden by community rating</button>
{showHiddenNotes&&fieldNotes.hidden.map(n=>(
<div key={n.id} style={{border:'1px solid #eee',borderRadius:10,padding:12,marginTop:8,opacity:0.6}}>
<div style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,background:'#F3F4F6',color:'#666',display:'inline-block',marginBottom:6}}>{FN_CATEGORIES.find(c=>c.v===n.category)?.l||n.category}</div>
<div style={{fontSize:13,color:'#666',lineHeight:1.5,marginBottom:6}}>{n.content}</div>
<div style={{fontSize:11,color:'#999'}}>@{n.user?.username||'reporter'} · 👍 {n.helpful_count} · 👎 {n.not_helpful_count}</div>
</div>
))}
</div>
)}
</div>

</div></div>)}
