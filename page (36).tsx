// @ts-nocheck
'use client'
import{useState}from'react'
import{BRAND}from'@/lib/logo'

type LicenseTier={name:string;pricing:Record<string,number>;rights:string[];duration:string}

const TIERS:Record<string,LicenseTier>={
  embed:{name:'Embed License',pricing:{editorial:0,commercial:6},rights:['Embed VozIt player on your site','VozIt branding shown','Link back required'],duration:'1 year'},
  digital:{name:'Digital License',pricing:{breaking:250,standard:150,social_clip:75},rights:['Download video file','Publish across digital properties','Post clips to social media','Credit VozIt + reporter required'],duration:'30 days'},
  broadcast:{name:'Broadcast License',pricing:{local_market:500,national:2500,documentary:3500,breaking_exclusive:7500,exclusive_24h:10000},rights:['Download high-quality file','TV broadcast rights','Streaming platform use','Archive rights','Credit required'],duration:'90 days'},
  wire:{name:'Wire Service License',pricing:{standard:3000,exclusive:10000,breaking_exclusive:15000},rights:['Download + redistribute','Sublicense to subscribers','Full editorial use','Credit required'],duration:'30 days'},
}

export default function LicensingPage(){
const[reportId,setReportId]=useState('')
const[report,setReport]=useState<any>(null)
const[selectedTier,setSelectedTier]=useState('')
const[selectedType,setSelectedType]=useState('')
const[org,setOrg]=useState('')
const[email,setEmail]=useState('')
const[name,setName]=useState('')
const[exclusive,setExclusive]=useState(false)
const[submitted,setSubmitted]=useState(false)
const[result,setResult]=useState<any>(null)
const[loading,setLoading]=useState(false)
const[lookingUp,setLookingUp]=useState(false)

async function lookupReport(){
  if(!reportId.trim())return
  setLookingUp(true)
  const r=await fetch(`/api/licensing?report_id=${reportId}`)
  const d=await r.json()
  setReport(d.report||null)
  setLookingUp(false)
}

async function submitRequest(){
  setLoading(true)
  const r=await fetch('/api/licensing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report_id:reportId,tier:selectedTier,license_type:selectedType,licensee_org:org,licensee_email:email,licensee_name:name,exclusive})})
  const d=await r.json()
  setResult(d)
  setSubmitted(true)
  setLoading(false)
}

const tier=TIERS[selectedTier]
const price=tier?.pricing[selectedType]||0

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<div style={{maxWidth:640,margin:'0 auto',padding:'40px 16px 60px'}}>

{/* Header */}
<div style={{textAlign:'center',marginBottom:30}}>
<div style={{fontSize:28,fontWeight:700,color:'#1a1a1a',marginBottom:4}}>VozIt Licensing</div>
<div style={{fontSize:14,color:'#888'}}>License citizen journalism footage for your publication</div>
<div style={{fontSize:12,color:BRAND.blue,marginTop:4}}>Revenue shared directly with the reporter who captured it</div>
</div>

{!submitted?(
<>
{/* Report lookup */}
<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',marginBottom:16}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>1. Find the report</div>
<div style={{display:'flex',gap:8}}>
<input value={reportId} onChange={e=>setReportId(e.target.value)} placeholder="Paste report ID or URL" style={{flex:1,padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
<button onClick={lookupReport} disabled={lookingUp} style={{padding:'10px 16px',borderRadius:8,border:'none',background:BRAND.orange,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{lookingUp?'...':'Look up'}</button>
</div>
{report&&<div style={{marginTop:12,padding:12,borderRadius:8,background:'#fafafa',display:'flex',gap:10,alignItems:'center'}}>
{report.thumbnail&&<img src={report.thumbnail} style={{width:80,height:48,borderRadius:6,objectFit:'cover'}} alt=""/>}
<div><div style={{fontSize:13,fontWeight:600,color:'#1a1a1a'}}>{report.title}</div><div style={{fontSize:11,color:'#888'}}>📍 {report.location} · @{report.reporter} · {report.isBreaking?'🔴 BREAKING':'Standard'}</div></div>
</div>}
</div>

{/* License tier selection */}
{report&&<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',marginBottom:16}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:12}}>2. Choose license type</div>
{Object.entries(TIERS).map(([id,t])=>(
<div key={id} onClick={()=>{setSelectedTier(id);setSelectedType('')}} style={{padding:14,borderRadius:10,border:'1px solid',borderColor:selectedTier===id?BRAND.blue:'#eee',background:selectedTier===id?'#EFF8FF':'#fff',cursor:'pointer',marginBottom:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a'}}>{t.name}</div>
<div style={{fontSize:12,color:'#888'}}>{t.duration}</div>
</div>
{selectedTier===id&&<div style={{marginTop:10}}>
<div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
{Object.entries(t.pricing).map(([type,p])=>(
<button key={type} onClick={e=>{e.stopPropagation();setSelectedType(type)}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid',borderColor:selectedType===type?BRAND.orange:'#ddd',background:selectedType===type?'#FEF3E6':'#fff',color:selectedType===type?BRAND.orange:'#666',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
{type.replace(/_/g,' ')} {p===0?'(free)':'— $'+p}
</button>
))}
</div>
<div style={{fontSize:11,color:'#888'}}>{t.rights.map((r,i)=><span key={i}>✓ {r}{i<t.rights.length-1?' · ':''}</span>)}</div>
</div>}
</div>
))}
</div>}

{/* Contact info + submit */}
{selectedType&&<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',marginBottom:16}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:12}}>3. Your details</div>
<div style={{display:'grid',gap:10}}>
<input value={org} onChange={e=>setOrg(e.target.value)} placeholder="Organization (e.g. CNN, Reuters)" style={{padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={{padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
</div>
{(selectedTier==='broadcast'||selectedTier==='wire')&&<label style={{display:'flex',alignItems:'center',gap:8,marginTop:10,cursor:'pointer'}}>
<input type="checkbox" checked={exclusive} onChange={e=>setExclusive(e.target.checked)}/><span style={{fontSize:12,color:'#666'}}>Request exclusive rights (24-48h)</span>
</label>}

<div style={{marginTop:16,padding:14,borderRadius:8,background:'#fafafa',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div><div style={{fontSize:12,color:'#888'}}>License fee</div><div style={{fontSize:22,fontWeight:700,color:'#1a1a1a'}}>{price===0?'Free':'$'+price.toLocaleString()}</div></div>
<button onClick={submitRequest} disabled={loading||!org||!email} style={{padding:'10px 24px',borderRadius:8,border:'none',background:BRAND.orange,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(!org||!email)?0.4:1}}>{loading?'Submitting...':price===0?'Get embed code':'Request license'}</button>
</div>
</div>}
</>
):(
/* Confirmation */
<div style={{background:'#fff',borderRadius:12,padding:24,border:'1px solid #eee',textAlign:'center'}}>
{result?.ok?(<>
<div style={{fontSize:36,marginBottom:12}}>✅</div>
<div style={{fontSize:18,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>{price===0?'Embed license activated':'License request submitted'}</div>
{result.embedCode&&<div style={{background:'#f5f5f5',borderRadius:8,padding:12,marginBottom:12,textAlign:'left'}}><div style={{fontSize:11,color:'#888',marginBottom:4}}>Embed code:</div><code style={{fontSize:11,color:'#333',wordBreak:'break-all'}}>{result.embedCode}</code></div>}
{price>0&&<div style={{fontSize:13,color:'#888',marginBottom:12}}>Our licensing team will contact you at {email} with payment details.</div>}
<div style={{fontSize:12,color:BRAND.blue}}>A portion of this fee goes directly to the citizen reporter.</div>
</>):(<>
<div style={{fontSize:36,marginBottom:12}}>❌</div>
<div style={{fontSize:14,color:'#991B1B'}}>{result?.error||'Something went wrong'}</div>
</>)}
<button onClick={()=>{setSubmitted(false);setResult(null)}} style={{marginTop:16,padding:'8px 20px',borderRadius:8,border:'1px solid #eee',background:'#fff',fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'#666'}}>New request</button>
</div>
)}
</div>
</div>)
}
