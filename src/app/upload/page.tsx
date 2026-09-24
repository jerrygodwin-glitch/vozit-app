// @ts-nocheck
'use client'
import{useState,useEffect,useRef}from'react'
import{createBrowserClient}from'@/lib/supabase'
import{NavBar}from'@/components/ui/NavBar'
import{CameraRecorder}from'@/components/camera/CameraRecorder'
import{VoiceOverRecorder}from'@/components/camera/VoiceOverRecorder'
import{BRAND}from'@/lib/logo'
import{saveDraftVideo,getDraftVideo,clearDraftVideo,saveDraftFields,getDraftFields,clearDraftFields}from'@/lib/draft-storage'

type Step='record'|'voiceover'|'mode'|'quick'|'detailed'|'review'|'submitting'|'done'
type FiveWs={who:string;what:string;where_text:string;when_happened:string;why:string}
type AISuggestion={suggested:FiveWs;confidence:Record<string,number>;sources:Record<string,string>;summary:string;tags:string[]}

// XHR (not fetch) is what actually exposes upload progress events, so a
// large video on a slow mobile connection shows real percentage instead of
// an indefinite spinner that looks frozen.
function uploadWithProgress(url:string,blob:Blob,onProgress:(pct:number)=>void):Promise<void>{
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest()
    xhr.open('PUT',url)
    xhr.setRequestHeader('Content-Type',blob.type||'video/webm')
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round((e.loaded/e.total)*100))}
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve();else reject(new Error(`Upload failed (${xhr.status}). Check your connection and try again.`))}
    xhr.onerror=()=>reject(new Error('Network error during upload. Check your connection and try again.'))
    xhr.send(blob)
  })
}

export default function UploadPage(){
const sb=createBrowserClient()
const[step,setStep]=useState<Step>('record')
const[title,setTitle]=useState('')
const[notes,setNotes]=useState('')
const[fiveW,setFiveW]=useState<FiveWs>({who:'',what:'',where_text:'',when_happened:'',why:''})
const[gps,setGps]=useState<{lat:number;lng:number}|null>(null)
const[aiSuggestion,setAiSuggestion]=useState<AISuggestion|null>(null)
const[analyzing,setAnalyzing]=useState(false)
const[accepted,setAccepted]=useState<Record<string,boolean>>({who:false,what:false,where_text:false,when_happened:false,why:false})
const[reportId,setReportId]=useState('')
const[videoBlob,setVideoBlob]=useState<Blob|null>(null)
const[videoDuration,setVideoDuration]=useState(0)
const[videoSource,setVideoSource]=useState<'live'|'upload'>('live')
const[hasAudio,setHasAudio]=useState(true)
const[audioBlob,setAudioBlob]=useState<Blob|null>(null)
const[updateToReportId,setUpdateToReportId]=useState('')
const[updateToTitle,setUpdateToTitle]=useState('')
const[uploadProgress,setUploadProgress]=useState(0)
const[submitError,setSubmitError]=useState('')
const[resumeDraft,setResumeDraft]=useState<{blob:Blob,meta:any,fields:any,savedAt:number}|null>(null)
const[isOnline,setIsOnline]=useState(true)
const submittingRef=useRef(false)

// Get GPS on mount
useEffect(()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=>{
      setGps({lat:p.coords.latitude,lng:p.coords.longitude})
    },()=>{},{enableHighAccuracy:true})
  }
},[])

// If we arrived via "Post an update" from an existing report, remember which one
useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  const id=params.get('update_to')
  if(id){setUpdateToReportId(id);setUpdateToTitle(params.get('update_to_title')||'')}
},[])

// A crash, refresh, or accidental tab close mid-recording previously lost
// the video and all tagging progress with no way back. Check for a
// recoverable draft (video in IndexedDB, text fields in localStorage) and
// offer to resume it instead of silently discarding it.
useEffect(()=>{
  getDraftVideo().then(draft=>{
    if(draft)setResumeDraft({blob:draft.blob,meta:draft.meta,fields:getDraftFields()||{},savedAt:draft.savedAt})
  })
},[])

// Offline detection — mid-flow network loss should say so, not just hang.
useEffect(()=>{
  setIsOnline(navigator.onLine)
  const on=()=>setIsOnline(true),off=()=>setIsOnline(false)
  window.addEventListener('online',on);window.addEventListener('offline',off)
  return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}
},[])

// Persist title/notes/5Ws as the reporter fills them in
useEffect(()=>{
  if(step==='quick'||step==='detailed'||step==='review')saveDraftFields({title,notes,fiveW})
},[title,notes,fiveW,step])

function resume(){
  if(!resumeDraft)return
  setFiveW(prev=>({...prev,...(resumeDraft.fields.fiveW||{})}))
  setTitle(resumeDraft.fields.title||'')
  setNotes(resumeDraft.fields.notes||'')
  handleVideoReady(resumeDraft.blob,resumeDraft.meta,false)
  setResumeDraft(null)
}
function discardDraft(){
  clearDraftVideo();clearDraftFields();setResumeDraft(null)
}

// Video captured or chosen — decide whether to offer a voice-over pass
function handleVideoReady(blob:Blob,metadata:{duration:number;gps?:{lat:number;lng:number};hasAudio:boolean;source:'live'|'upload'},persist=true){
  setVideoBlob(blob)
  setVideoDuration(metadata.duration)
  setVideoSource(metadata.source)
  setHasAudio(metadata.hasAudio)
  if(metadata.gps)setGps(metadata.gps)
  if(persist)saveDraftVideo(blob,metadata)
  // Live recordings are already narrated via the on-screen 5W prompts.
  // Uploaded silent footage gets the option to add a voice-over pass.
  setStep(metadata.source==='upload'?'voiceover':'mode')
}

// Request AI analysis
async function requestAIAnalysis(){
  setAnalyzing(true)
  try{
    const r=await fetch('/api/ai-analyze',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        report_id:reportId||undefined,
        title, notes,
        ...fiveW,
        gps, captured_at:new Date().toISOString(),
      }),
    })
    const d=await r.json()
    if(d.ok&&d.analysis){
      setAiSuggestion(d.analysis)
      // Auto-accept high-confidence suggestions for empty fields
      const acc:Record<string,boolean>={}
      const s=d.analysis.suggested as FiveWs
      const c=d.analysis.confidence as Record<string,number>
      for(const k of Object.keys(s) as (keyof FiveWs)[]){
        acc[k]=!fiveW[k]&&(s[k] as string).length>0&&(c[k]||0)>0.5
        if(acc[k])setFiveW(prev=>({...prev,[k]:s[k]}))
      }
      setAccepted(acc)
    }
  }catch{}
  setAnalyzing(false)
  setStep('review')
}

async function submitReport(){
  if(submittingRef.current)return // guard against a double-tap firing this twice
  submittingRef.current=true
  setStep('submitting')
  setUploadProgress(0)
  setSubmitError('')
  try{
    const{data:{user}}=await sb.auth.getUser()
    if(!user){submittingRef.current=false;return}

    // Upload the captured video to Mux before creating the report, so the
    // report can be linked to it from the moment it's created.
    let mux_upload_id:string|undefined
    if(videoBlob){
      const upRes=await fetch('/api/reports/upload-url',{method:'POST'})
      const upData=await upRes.json()
      if(!upData.uploadUrl)throw new Error('Could not start the video upload. Please try again.')
      await uploadWithProgress(upData.uploadUrl,videoBlob,setUploadProgress)
      mux_upload_id=upData.uploadId
    }

    const r=await fetch('/api/reports',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        title,
        ...fiveW,
        location_lat:gps?.lat,location_lng:gps?.lng,
        ai_enhanced:!!aiSuggestion,
        ai_tags:aiSuggestion?.tags||[],
        update_to_report_id:updateToReportId||undefined,
        mux_upload_id,
      }),
    })
    const d=await r.json()
    if(!r.ok)throw new Error(d.error||'Could not publish your report. Please try again.')
    if(d.report?.id){
      setReportId(d.report.id)
      if(audioBlob){
        const fd=new FormData()
        fd.append('voice_over',audioBlob,'voiceover.webm')
        fd.append('report_id',d.report.id)
        fetch('/api/reports/voice-over',{method:'POST',body:fd}).catch(()=>{})
      }
    }
    clearDraftVideo();clearDraftFields()
    submittingRef.current=false
    setStep('done')
  }catch(e:any){
    // The video blob, title, and 5Ws are all still in state (and still
    // saved as a draft) — the reporter can just hit Publish again instead
    // of losing everything and starting over from a failed upload.
    submittingRef.current=false
    setSubmitError(e.message||'Something went wrong. Please try again.')
    setStep('review')
  }
}

function toggleAccept(field:keyof FiveWs){
  if(!aiSuggestion)return
  const newVal=!accepted[field]
  setAccepted(a=>({...a,[field]:newVal}))
  if(newVal){
    setFiveW(prev=>({...prev,[field]:aiSuggestion.suggested[field]}))
  }else{
    // Revert to reporter's original (empty if they didn't fill it)
    setFiveW(prev=>({...prev,[field]:''}))
  }
}

const wConfig=[
  {key:'who' as const,label:'WHO',color:'#B53D0F',placeholder:'Who is involved?',icon:'👤'},
  {key:'what' as const,label:'WHAT',color:'#1565C0',placeholder:'What is happening?',icon:'📋'},
  {key:'where_text' as const,label:'WHERE',color:'#085041',placeholder:'Where is this?',icon:'📍'},
  {key:'when_happened' as const,label:'WHEN',color:'#854F0B',placeholder:'When did it happen?',icon:'🕐'},
  {key:'why' as const,label:'WHY',color:'#993556',placeholder:'Why is it happening?',icon:'❓'},
]

const confidenceLabel=(c:number)=>c>=0.8?'High':c>=0.5?'Medium':'Low'
const confidenceColor=(c:number)=>c>=0.8?'#22C55E':c>=0.5?'#EAB308':'#888'
const sourceLabel=(s:string)=>({reporter:'You said this',transcript:'From audio',gps:'From GPS',device_timestamp:'From device',ai_analysis:'AI analyzed',ai_inference:'AI suggested',title:'From title',none:'Not available'}[s]||s)

// ── RECORD STEP ──────────────────────────────────────────────
if(step==='record')return(<div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
{!isOnline&&<div style={{background:'#DC2626',color:'#fff',textAlign:'center',padding:'8px 12px',fontSize:12,fontWeight:600}}>⚠️ You're offline — recording still works, but you'll need a connection to publish</div>}
{resumeDraft&&<div style={{background:'#FEF3E6',border:'1px solid #FED7AA',padding:12,margin:12,borderRadius:10}}>
<div style={{fontSize:13,fontWeight:600,color:'#92400E',marginBottom:4}}>Unfinished report found</div>
<div style={{fontSize:12,color:'#92400E',marginBottom:8}}>From {new Date(resumeDraft.savedAt).toLocaleString()} — pick up where you left off?</div>
<div style={{display:'flex',gap:8}}>
<button onClick={resume} style={{flex:1,padding:8,borderRadius:8,border:'none',background:BRAND.orange,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Resume</button>
<button onClick={discardDraft} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #FED7AA',background:'transparent',color:'#92400E',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Discard</button>
</div>
</div>}
<CameraRecorder onVideoReady={handleVideoReady} maxDuration={90}/>
<NavBar/>
</div>)


// ── VOICE-OVER STEP (for uploaded videos) ────────────────
if(step==='voiceover')return(<div style={{minHeight:'100vh',background:'#111'}}>
<div style={{maxWidth:480,margin:'0 auto',padding:'24px 16px 100px'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
<span style={{fontSize:20}}>🎙️</span>
<div><div style={{fontSize:18,fontWeight:700,color:'#fff'}}>Add voice narration?</div>
<div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Record a voice track over your video using the 5W format</div></div>
</div>

{videoBlob&&<VoiceOverRecorder
  videoBlob={videoBlob}
  videoDuration={videoDuration}
  onComplete={(blob,meta)=>{
    setVideoBlob(blob)
    setHasAudio(true)
    if(meta.audioBlob)setAudioBlob(meta.audioBlob)
    setStep('mode')
  }}
  onSkip={()=>setStep('mode')}
/>}
</div>
<NavBar/>
</div>)

// ── MODE SELECTION ───────────────────────────────────────────
if(step==='mode')return(<div style={{minHeight:'100vh',background:'#fff'}}>
<div style={{maxWidth:440,margin:'0 auto',padding:'40px 16px 100px'}}>
<h2 style={{fontSize:20,fontWeight:700,color:'#1a1a1a',marginBottom:4}}>How do you want to tag?</h2>
<p style={{fontSize:13,color:'#888',marginBottom:20}}>Choose based on your situation right now.</p>

<div onClick={()=>setStep('quick')} style={{padding:20,borderRadius:14,border:'2px solid #FE3D07',background:'#FEF3E6',cursor:'pointer',marginBottom:12}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
<span style={{fontSize:24}}>⚡</span>
<div><div style={{fontSize:16,fontWeight:700,color:'#1a1a1a'}}>Quick mode</div><div style={{fontSize:12,color:BRAND.orange,fontWeight:500}}>Recommended for breaking situations</div></div>
</div>
<div style={{fontSize:13,color:'#666',lineHeight:1.5}}>Just add a title and optional notes. AI analyzes your video audio, GPS, and footage to fill in the 5Ws. You review and edit before publishing.</div>
</div>

<div onClick={()=>setStep('detailed')} style={{padding:20,borderRadius:14,border:'1px solid #eee',background:'#fff',cursor:'pointer'}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
<span style={{fontSize:24}}>📝</span>
<div><div style={{fontSize:16,fontWeight:700,color:'#1a1a1a'}}>Detailed mode</div><div style={{fontSize:12,color:'#888',fontWeight:500}}>For when you have time to write</div></div>
</div>
<div style={{fontSize:13,color:'#666',lineHeight:1.5}}>Fill in the 5Ws yourself. AI will still offer suggestions for any fields you leave empty.</div>
</div>
</div>
<NavBar/>
</div>)

// ── QUICK MODE ───────────────────────────────────────────────
if(step==='quick')return(<div style={{minHeight:'100vh',background:'#fff'}}>
<div style={{maxWidth:440,margin:'0 auto',padding:'24px 16px 100px'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
<span style={{fontSize:20}}>⚡</span>
<div><div style={{fontSize:18,fontWeight:700,color:'#1a1a1a'}}>Quick tag</div><div style={{fontSize:11,color:'#888'}}>AI will fill in the rest from your video</div></div>
</div>
{updateToReportId&&<div style={{padding:10,borderRadius:8,background:'#FEF3E6',border:'1px solid #FED7AA',marginBottom:14,fontSize:12,color:'#92400E'}}>🔴 Posting an update to <strong>{updateToTitle||'your report'}</strong></div>}

<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:600,color:'#1a1a1a',display:'block',marginBottom:4}}>Title *</label>
<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What are you witnessing? (e.g. 'Shelling in Saltivka district')" style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #ddd',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
</div>

<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:600,color:'#1a1a1a',display:'block',marginBottom:4}}>Quick notes <span style={{fontWeight:400,color:'#aaa'}}>(optional)</span></label>
<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Anything else you want to add — context, what you saw, who was there..." style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical'}}/>
</div>

{gps&&<div style={{padding:10,borderRadius:8,background:'#ECFDF5',border:'1px solid #d0f0e0',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
<span>📍</span><span style={{fontSize:12,color:'#065F46'}}>GPS location captured automatically</span>
</div>}

<div style={{padding:10,borderRadius:8,background:'#FEF3E6',border:'1px solid #FED7AA',marginBottom:14}}>
<div style={{fontSize:12,fontWeight:600,color:'#92400E',marginBottom:4}}>🎙️ VozIt tradition</div>
<div style={{fontSize:12,color:'#92400E',lineHeight:1.5}}>End your video by saying <strong>&quot;I was there&quot;</strong> followed by your name and location. Any language works!</div>
<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{['I was there','Yo estuve ahí','Eu estava lá','Nilikuwa pale'].map(s=>(
<span key={s} style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'rgba(254,61,7,0.1)',color:'#B53D0F'}}>{s}</span>
))}
</div>
</div>

<button onClick={requestAIAnalysis} disabled={!title.trim()||analyzing} style={{width:'100%',padding:14,borderRadius:10,border:'none',background:BRAND.orange,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(!title.trim()||analyzing)?0.4:1}}>
{analyzing?'🤖 AI is analyzing your video...':'🤖 Let AI fill in the 5Ws'}
</button>

<div style={{textAlign:'center',marginTop:12}}>
<span onClick={()=>setStep('detailed')} style={{fontSize:12,color:BRAND.blue,cursor:'pointer'}}>Switch to detailed mode →</span>
</div>
</div>
<NavBar/>
</div>)

// ── DETAILED MODE ────────────────────────────────────────────
if(step==='detailed')return(<div style={{minHeight:'100vh',background:'#fff'}}>
<div style={{maxWidth:440,margin:'0 auto',padding:'24px 16px 100px'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
<span style={{fontSize:20}}>📝</span>
<div><div style={{fontSize:18,fontWeight:700,color:'#1a1a1a'}}>Tag your report</div><div style={{fontSize:11,color:'#888'}}>Fill in what you can — AI helps with the rest</div></div>
</div>
{updateToReportId&&<div style={{padding:10,borderRadius:8,background:'#FEF3E6',border:'1px solid #FED7AA',marginBottom:14,fontSize:12,color:'#92400E'}}>🔴 Posting an update to <strong>{updateToTitle||'your report'}</strong></div>}

<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:600,color:'#1a1a1a',display:'block',marginBottom:4}}>Title *</label>
<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Headline for your report" style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:14,outline:'none',fontFamily:'inherit'}}/>
</div>

{wConfig.map(w=>(
<div key={w.key} style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:700,color:w.color,display:'flex',alignItems:'center',gap:4,marginBottom:4}}><span>{w.icon}</span>{w.label}</label>
<input value={fiveW[w.key]} onChange={e=>setFiveW(p=>({...p,[w.key]:e.target.value}))} placeholder={w.placeholder} style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
</div>
))}

<button onClick={requestAIAnalysis} disabled={!title.trim()||analyzing} style={{width:'100%',padding:14,borderRadius:10,border:'none',background:BRAND.orange,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(!title.trim()||analyzing)?0.4:1,marginBottom:8}}>
{analyzing?'🤖 Analyzing...':'🤖 Enhance with AI & review'}
</button>

<button onClick={()=>{setStep('review');setAiSuggestion(null)}} disabled={!title.trim()} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #eee',background:'#fff',color:'#666',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
Skip AI — submit as-is
</button>
</div>
<NavBar/>
</div>)

// ── AI REVIEW STEP ───────────────────────────────────────────
if(step==='review')return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<div style={{maxWidth:480,margin:'0 auto',padding:'24px 16px 100px'}}>
<h2 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',marginBottom:4}}>Review your report</h2>
<p style={{fontSize:12,color:'#888',marginBottom:16}}>{aiSuggestion?'AI suggestions shown below. Accept, edit, or replace each field.':'Review your 5Ws before submitting.'}</p>

<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #eee',marginBottom:12}}>
<div style={{fontSize:11,color:'#888',marginBottom:4}}>Title</div>
<div style={{fontSize:16,fontWeight:600,color:'#1a1a1a'}}>{title}</div>
</div>

{wConfig.map(w=>{
  const hasAI=aiSuggestion&&aiSuggestion.suggested[w.key]
  const conf=aiSuggestion?.confidence[w.key]||0
  const source=aiSuggestion?.sources[w.key]||''
  const isAccepted=accepted[w.key]

  return(
  <div key={w.key} style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid',borderColor:hasAI&&!fiveW[w.key]?'#FEF3E6':'#eee',marginBottom:8}}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
    <label style={{fontSize:11,fontWeight:700,color:w.color,display:'flex',alignItems:'center',gap:4}}><span>{w.icon}</span>{w.label}</label>
    {hasAI&&<div style={{display:'flex',alignItems:'center',gap:4}}>
      <span style={{fontSize:9,color:confidenceColor(conf),fontWeight:500}}>{confidenceLabel(conf)}</span>
      <span style={{fontSize:9,color:'#aaa'}}>· {sourceLabel(source)}</span>
    </div>}
  </div>

  <input value={fiveW[w.key]} onChange={e=>setFiveW(p=>({...p,[w.key]:e.target.value}))} placeholder={w.placeholder} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #eee',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:hasAI&&!isAccepted&&aiSuggestion.suggested[w.key]!==fiveW[w.key]?6:0}}/>

  {hasAI&&!isAccepted&&aiSuggestion.suggested[w.key]&&aiSuggestion.suggested[w.key]!==fiveW[w.key]&&(
  <div onClick={()=>toggleAccept(w.key)} style={{padding:'6px 10px',borderRadius:6,background:'#FEF3E6',border:'1px solid #FED7AA',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
    <span style={{fontSize:12}}>🤖</span>
    <span style={{fontSize:11,color:'#92400E',flex:1}}>{aiSuggestion.suggested[w.key]}</span>
    <span style={{fontSize:10,color:BRAND.orange,fontWeight:600}}>Use this</span>
  </div>
  )}
  </div>)
})}

{aiSuggestion?.tags&&aiSuggestion.tags.length>0&&(
<div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #eee',marginBottom:12}}>
<div style={{fontSize:11,color:'#888',marginBottom:6}}>🏷️ Suggested tags</div>
<div style={{display:'flex',flexWrap:'wrap',gap:4}}>
{aiSuggestion.tags.map(t=><span key={t} style={{padding:'4px 10px',borderRadius:12,background:'#f0f0f0',fontSize:11,color:'#555'}}>#{t}</span>)}
</div>
</div>
)}

{submitError&&<div style={{background:'#FEF2F2',color:'#DC2626',padding:12,borderRadius:10,fontSize:12,marginBottom:10}}>⚠️ {submitError}</div>}
{!isOnline&&<div style={{background:'#FEF3E6',color:'#92400E',padding:10,borderRadius:10,fontSize:12,marginBottom:10}}>You're offline — reconnect to publish</div>}
<button onClick={submitReport} disabled={!title.trim()||!isOnline} style={{width:'100%',padding:14,borderRadius:10,border:'none',background:'#22C55E',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4,opacity:(!title.trim()||!isOnline)?0.5:1}}>
{submitError?'↻ Retry publish':'✓ Publish report'}
</button>

<button onClick={()=>setStep(aiSuggestion?'quick':'detailed')} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid #eee',background:'#fff',color:'#888',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginTop:6}}>
← Go back and edit
</button>
</div>
<NavBar/>
</div>)

// ── SUBMITTING ───────────────────────────────────────────────
if(step==='submitting')return(<div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
<div style={{textAlign:'center',width:220}}>
<div style={{fontSize:40,marginBottom:8}}>{videoBlob&&uploadProgress<100?'📤':'🤖'}</div>
<div style={{color:'#888',fontSize:14,marginBottom:10}}>{videoBlob&&uploadProgress<100?`Uploading video... ${uploadProgress}%`:'Publishing your report...'}</div>
{videoBlob&&<div style={{height:6,borderRadius:3,background:'#eee',overflow:'hidden'}}><div style={{height:'100%',width:`${uploadProgress}%`,background:BRAND.orange,transition:'width 0.2s'}}/></div>}
</div>
<NavBar/>
</div>)

// ── DONE ─────────────────────────────────────────────────────
return(<div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
<div style={{textAlign:'center',padding:24}}>
<div style={{fontSize:48,marginBottom:12}}>✅</div>
<h2 style={{fontSize:20,fontWeight:700,color:'#1a1a1a',marginBottom:4}}>Report submitted!</h2>
<p style={{fontSize:13,color:'#888',marginBottom:20}}>Your video is processing. It will be reviewed and published shortly.</p>
{reportId&&<div style={{marginBottom:12}}>
<a href={`/upload?update_to=${reportId}&update_to_title=${encodeURIComponent(title)}`} style={{display:'inline-block',padding:'10px 20px',borderRadius:8,border:'1px solid #FED7AA',background:'#FEF3E6',color:'#B53D0F',fontSize:13,fontWeight:600,textDecoration:'none',fontFamily:'inherit'}}>🔴 Still unfolding? Post an update</a>
</div>}
<div style={{display:'flex',gap:8,justifyContent:'center'}}>
<button onClick={()=>{setStep('record');setTitle('');setNotes('');setFiveW({who:'',what:'',where_text:'',when_happened:'',why:''});setAiSuggestion(null);setUpdateToReportId('');setUpdateToTitle('')}} style={{padding:'10px 20px',borderRadius:8,border:'none',background:BRAND.orange,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Record another</button>
<a href="/feed" style={{padding:'10px 20px',borderRadius:8,border:'1px solid #eee',background:'#fff',color:'#666',fontSize:13,fontWeight:500,textDecoration:'none',fontFamily:'inherit'}}>Go to feed</a>
</div>
</div>
<NavBar/>
</div>)
}
