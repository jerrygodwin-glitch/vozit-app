// @ts-nocheck
import{createServerClient}from'@/lib/supabase-server'
import{cookies}from'next/headers'
import Link from'next/link'

export const dynamic='force-dynamic'

export default async function ReporterProfile({params}:{params:{username:string}}){
const supabase=createServerClient()
const{data:reporter}=await supabase.from('users').select('id, username, display_name, bio, avatar_url, tier, report_count, credibility_score, created_at').eq('username',params.username).eq('is_banned',false).single()

if(!reporter)return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}><p style={{color:'#888'}}>Reporter not found</p></div>

const{data:reports}=await supabase.from('reports').select('id, title, thumbnail_url, playback_id, location_name, created_at, upvotes, downvotes, credibility_pct, duration').eq('user_id',reporter.id).eq('status','published').order('created_at',{ascending:false}).limit(20)

const tierColors:Record<string,string>={starter:'#22C55E',silver:'#94A3B8',gold:'#EAB308',platinum:'#8B5CF6'}
const tc=tierColors[reporter.tier]||tierColors.starter

return(<div style={{minHeight:'100vh',background:'#f5f5f5',fontFamily:'-apple-system, system-ui, sans-serif'}}>
<div style={{maxWidth:600,margin:'0 auto',padding:'24px 16px 60px'}}>

{/* Reporter header */}
<div style={{background:'#fff',borderRadius:16,padding:24,border:'1px solid #eee',marginBottom:16,textAlign:'center'}}>
<div style={{width:72,height:72,borderRadius:36,background:`linear-gradient(135deg, ${tc}, ${tc}88)`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',border:`3px solid ${tc}33`}}>
<span style={{color:'#fff',fontSize:28,fontWeight:700}}>{(reporter.display_name||reporter.username)[0].toUpperCase()}</span>
</div>
<div style={{fontSize:20,fontWeight:700,color:'#1a1a1a'}}>{reporter.display_name||reporter.username}</div>
<div style={{fontSize:13,color:'#888',marginBottom:8}}>@{reporter.username}</div>
<span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:12,background:`${tc}18`,color:tc}}>★ {reporter.tier.charAt(0).toUpperCase()+reporter.tier.slice(1)} Reporter</span>
{reporter.bio&&<p style={{fontSize:13,color:'#666',marginTop:12,lineHeight:1.5}}>{reporter.bio}</p>}

<div style={{display:'flex',justifyContent:'center',gap:24,marginTop:16}}>
<div><div style={{fontSize:20,fontWeight:700,color:'#1a1a1a'}}>{reporter.report_count}</div><div style={{fontSize:11,color:'#888'}}>Reports</div></div>
<div><div style={{fontSize:20,fontWeight:700,color:tc}}>{reporter.credibility_score||0}%</div><div style={{fontSize:11,color:'#888'}}>Credibility</div></div>
<div><div style={{fontSize:20,fontWeight:700,color:'#888'}}>{Math.ceil((Date.now()-new Date(reporter.created_at).getTime())/(1000*60*60*24))}</div><div style={{fontSize:11,color:'#888'}}>Days active</div></div>
</div>
</div>

{/* Reports grid */}
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>Reports ({reports?.length||0})</div>
{(!reports||reports.length===0)?<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',textAlign:'center',color:'#888',fontSize:13}}>No published reports yet</div>:
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{reports.map(r=>(
<Link key={r.id} href={`/report/${r.id}`} style={{textDecoration:'none'}}>
<div style={{background:'#fff',borderRadius:10,overflow:'hidden',border:'1px solid #eee'}}>
{r.thumbnail_url?<img src={r.thumbnail_url} style={{width:'100%',height:100,objectFit:'cover'}} alt=""/>:<div style={{width:'100%',height:100,background:'#f0f0f0'}}/>}
<div style={{padding:10}}>
<div style={{fontSize:12,fontWeight:600,color:'#1a1a1a',lineHeight:1.3,height:32,overflow:'hidden'}}>{r.title}</div>
<div style={{fontSize:10,color:'#888',marginTop:4}}>📍 {r.location_name||'Unknown'}</div>
<div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
<span style={{fontSize:10,color:'#22C55E'}}>{r.credibility_pct}%</span>
<span style={{fontSize:10,color:'#888'}}>{new Date(r.created_at).toLocaleDateString()}</span>
</div>
</div>
</div>
</Link>
))}
</div>}

<div style={{textAlign:'center',marginTop:20}}><Link href="/feed" style={{color:'#0a8fe8',fontSize:13,fontWeight:500,textDecoration:'none'}}>← Back to feed</Link></div>
</div>
</div>)
}
