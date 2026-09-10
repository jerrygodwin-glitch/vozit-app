// @ts-nocheck
'use client'
import{useState,useEffect,useCallback}from'react'
import{createBrowserClient}from'@/lib/supabase'
import{NavBar}from'@/components/ui/NavBar'
import{BRAND}from'@/lib/logo'
import{ShareIconRow}from'@/components/share/ShareButton'
import Link from'next/link'

type Report={id:string;title:string;thumbnail_url:string;playback_id:string;location_name:string;created_at:string;upvotes:number;downvotes:number;credibility_pct:number;duration:number;user:{username:string;display_name:string;tier:string}}

export default function SearchPage(){
const sb=createBrowserClient()
const[query,setQuery]=useState('')
const[results,setResults]=useState<Report[]>([])
const[loading,setLoading]=useState(false)
const[searched,setSearched]=useState(false)
const[filter,setFilter]=useState<'all'|'recent'|'trending'|'credible'>('all')
const tierColors:Record<string,string>={starter:'#22C55E',silver:'#94A3B8',gold:'#EAB308',platinum:'#8B5CF6'}

const search=useCallback(async()=>{
  if(!query.trim())return
  setLoading(true);setSearched(true)
  let q=sb.from('reports').select('id, title, thumbnail_url, playback_id, location_name, created_at, upvotes, downvotes, credibility_pct, duration, user:users(username, display_name, tier)').eq('status','published').or(`title.ilike.%${query}%,location_name.ilike.%${query}%,who.ilike.%${query}%,what.ilike.%${query}%`)
  if(filter==='recent')q=q.order('created_at',{ascending:false})
  else if(filter==='trending')q=q.order('trending_score',{ascending:false})
  else if(filter==='credible')q=q.order('credibility_pct',{ascending:false})
  else q=q.order('created_at',{ascending:false})
  q=q.limit(30)
  const{data}=await q
  setResults((data as Report[])||[])
  setLoading(false)
},[query,filter,sb])

useEffect(()=>{const t=setTimeout(()=>{if(query.length>=2)search()},400);return()=>clearTimeout(t)},[query,search])

const filters=[{id:'all' as const,l:'All'},{id:'recent' as const,l:'Latest'},{id:'trending' as const,l:'Trending'},{id:'credible' as const,l:'Most credible'}]

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<NavBar/>
<div style={{maxWidth:600,margin:'0 auto',padding:'80px 16px 100px'}}>

{/* Search input */}
<div style={{position:'relative',marginBottom:16}}>
<span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:18,color:'#999'}}>🔍</span>
<input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search reports by keyword, location, reporter..." style={{width:'100%',padding:'14px 14px 14px 44px',borderRadius:12,border:'1px solid #ddd',fontSize:15,outline:'none',fontFamily:'inherit',background:'#fff'}}/>
</div>

{/* Filters */}
<div style={{display:'flex',gap:6,marginBottom:16}}>
{filters.map(f=>(<button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid',borderColor:filter===f.id?BRAND.orange:'#eee',background:filter===f.id?'#FEF3E6':'#fff',color:filter===f.id?BRAND.orange:'#888',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{f.l}</button>))}
</div>

{/* Results */}
{loading?<div style={{textAlign:'center',padding:40,color:'#888'}}>Searching...</div>:
!searched?<div style={{textAlign:'center',padding:40}}>
<div style={{fontSize:32,marginBottom:12}}>🔍</div>
<div style={{color:'#888',fontSize:14}}>Search for eyewitness reports</div>
<div style={{color:'#bbb',fontSize:12,marginTop:4}}>Try a location, topic, or reporter name</div>
<div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginTop:16}}>
{['Ukraine','protest','climate','Lagos','breaking'].map(s=>(<button key={s} onClick={()=>{setQuery(s)}} style={{padding:'6px 12px',borderRadius:16,border:'1px solid #eee',background:'#fff',color:'#666',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>))}
</div>
</div>:
results.length===0?<div style={{textAlign:'center',padding:40,color:'#888',fontSize:14}}>No reports found for "{query}"</div>:
<div>
<div style={{fontSize:12,color:'#888',marginBottom:10}}>{results.length} report{results.length!==1?'s':''} found</div>
{results.map(r=>(
<Link key={r.id} href={`/report/${r.id}`} style={{textDecoration:'none'}}>
<div style={{background:'#fff',borderRadius:12,padding:12,border:'1px solid #eee',marginBottom:8,display:'flex',gap:12,cursor:'pointer'}}>
{r.thumbnail_url?<img src={r.thumbnail_url} style={{width:120,height:72,borderRadius:8,objectFit:'cover',flexShrink:0}} alt=""/>:<div style={{width:120,height:72,borderRadius:8,background:'#f0f0f0',flexShrink:0}}/>}
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</div>
<div style={{fontSize:11,color:'#888',marginBottom:4}}>
<span style={{marginRight:6}}>📍 {r.location_name||'Unknown'}</span>
<span>· {new Date(r.created_at).toLocaleDateString()}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:11,color:'#666'}}>@{r.user?.username}</span>
<span style={{fontSize:9,padding:'1px 5px',borderRadius:3,fontWeight:600,background:`${tierColors[r.user?.tier||'starter']}22`,color:tierColors[r.user?.tier||'starter']}}>★ {(r.user?.tier||'starter').charAt(0).toUpperCase()+(r.user?.tier||'starter').slice(1)}</span>
<span style={{fontSize:11,color:'#22C55E',marginLeft:'auto'}}>{r.credibility_pct}% credible</span>
</div>
</div>
</div>
</Link>
))}
</div>}
</div>
</div>)
}
