// @ts-nocheck
'use client'
import{useState,useEffect}from'react'
import{createBrowserClient}from'@/lib/supabase'
import{NavBar}from'@/components/ui/NavBar'
import{BRAND}from'@/lib/logo'

type EarningRow={id:string;report_id:string;amount:number;source:string;created_at:string;hold_until:string;paid_out:boolean;report?:{title:string;thumbnail_url:string;playback_id:string}}
type SocialStat={platform:string;views:number;likes:number;estimated_revenue:number}

export default function EarningsPage(){
const sb=createBrowserClient()
const[earnings,setEarnings]=useState<EarningRow[]>([])
const[socialStats,setSocialStats]=useState<SocialStat[]>([])
const[loading,setLoading]=useState(true)
const[period,setPeriod]=useState<'7d'|'30d'|'all'>('30d')
const[totals,setTotals]=useState({total:0,adRevenue:0,licensing:0,tips:0,bounties:0,socialViews:0})

useEffect(()=>{
  loadEarnings()
},[period])

async function loadEarnings(){
  setLoading(true)
  const{data:{user}}=await sb.auth.getUser()
  if(!user){setLoading(false);return}

  let query=sb.from('earnings').select('*, report:reports(title, thumbnail_url, playback_id)').eq('user_id',user.id).order('created_at',{ascending:false})
  if(period==='7d'){const d=new Date();d.setDate(d.getDate()-7);query=query.gte('created_at',d.toISOString())}
  else if(period==='30d'){const d=new Date();d.setDate(d.getDate()-30);query=query.gte('created_at',d.toISOString())}

  const{data}=await query
  setEarnings(data||[])

  const t={total:0,adRevenue:0,licensing:0,tips:0,bounties:0,socialViews:0}
  for(const e of(data||[])){
    t.total+=e.amount
    if(e.source==='ad_revenue')t.adRevenue+=e.amount
    else if(e.source==='licensing')t.licensing+=e.amount
    else if(e.source==='tip')t.tips+=e.amount
    else if(e.source==='bounty')t.bounties+=e.amount
  }

  // Fetch social analytics
  const{data:social}=await sb.from('social_analytics').select('platform, views, likes, estimated_revenue').in('report_id',(data||[]).map(e=>e.report_id).filter(Boolean))
  setSocialStats(social||[])
  t.socialViews=(social||[]).reduce((s,r)=>s+r.views,0)
  setTotals(t)
  setLoading(false)
}

const sourceIcons:Record<string,string>={ad_revenue:'📺',licensing:'📄',tip:'💝',bounty:'🎯'}
const sourceLabels:Record<string,string>={ad_revenue:'Ad revenue',licensing:'License fee',tip:'Tip',bounty:'Assignment bounty'}
const platformIcons:Record<string,string>={youtube:'📺',tiktok:'🎵',instagram:'📸',facebook:'👤',x:'𝕏',embed:'</>'}
const periods=[{id:'7d' as const,l:'7 days'},{id:'30d' as const,l:'30 days'},{id:'all' as const,l:'All time'}]

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<NavBar/>
<div style={{maxWidth:560,margin:'0 auto',padding:'80px 16px 100px'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
<div><h1 style={{fontSize:20,fontWeight:600,color:'#1a1a1a',marginBottom:2}}>Earnings</h1><p style={{fontSize:12,color:'#888'}}>Revenue breakdown by report and source</p></div>
<div style={{display:'flex',gap:4}}>{periods.map(p=>(<button key={p.id} onClick={()=>setPeriod(p.id)} style={{padding:'5px 10px',borderRadius:6,border:'1px solid',borderColor:period===p.id?BRAND.blue:'#eee',background:period===p.id?'#EFF8FF':'#fff',color:period===p.id?BRAND.blue:'#888',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{p.l}</button>))}</div>
</div>

{/* Summary cards */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
<div style={{background:'#fff',borderRadius:10,padding:14,border:'1px solid #eee',gridColumn:'span 2'}}>
<div style={{fontSize:11,color:'#888'}}>Total earned ({periods.find(p=>p.id===period)?.l})</div>
<div style={{fontSize:28,fontWeight:700,color:'#1a1a1a'}}>${totals.total.toFixed(2)}</div>
</div>
{[{l:'Ad revenue',v:totals.adRevenue,c:'#0a8fe8',i:'📺'},{l:'Licensing',v:totals.licensing,c:'#8B5CF6',i:'📄'},{l:'Tips',v:totals.tips,c:'#EAB308',i:'💝'},{l:'Bounties',v:totals.bounties,c:'#22C55E',i:'🎯'}].map(s=>(
<div key={s.l} style={{background:'#fff',borderRadius:10,padding:12,border:'1px solid #eee'}}>
<div style={{fontSize:11,color:'#888'}}>{s.i} {s.l}</div>
<div style={{fontSize:18,fontWeight:700,color:s.c}}>${s.v.toFixed(2)}</div>
</div>
))}
</div>

{/* Social platform breakdown */}
{socialStats.length>0&&<div style={{background:'#fff',borderRadius:10,padding:14,border:'1px solid #eee',marginBottom:16}}>
<div style={{fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>Social platform performance</div>
{Object.entries(socialStats.reduce<Record<string,{views:number;likes:number;rev:number}>>((acc,s)=>{
  if(!acc[s.platform])acc[s.platform]={views:0,likes:0,rev:0}
  acc[s.platform].views+=s.views;acc[s.platform].likes+=s.likes;acc[s.platform].rev+=s.estimated_revenue
  return acc
},{})).map(([platform,stats])=>(
<div key={platform} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
<span style={{fontSize:18,width:24,textAlign:'center'}}>{platformIcons[platform]||'📊'}</span>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:'#1a1a1a',textTransform:'capitalize'}}>{platform}</div><div style={{fontSize:11,color:'#888'}}>{stats.views.toLocaleString()} views · {stats.likes.toLocaleString()} likes</div></div>
<div style={{fontSize:14,fontWeight:600,color:'#22C55E'}}>${stats.rev.toFixed(2)}</div>
</div>
))}
<div style={{fontSize:10,color:'#aaa',textAlign:'center',marginTop:8}}>{totals.socialViews.toLocaleString()} total views across all platforms</div>
</div>}

{/* Per-report earnings */}
<div style={{fontSize:13,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>By report</div>
{loading?<div style={{textAlign:'center',padding:20,color:'#888'}}>Loading...</div>:
earnings.length===0?<div style={{background:'#fff',borderRadius:10,padding:20,border:'1px solid #eee',textAlign:'center',color:'#888',fontSize:13}}>No earnings in this period</div>:
earnings.map(e=>{
  const held=new Date(e.hold_until)>new Date()
  return(
  <div key={e.id} style={{background:'#fff',borderRadius:10,padding:12,border:'1px solid #eee',marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
  {e.report?.thumbnail_url?<img src={e.report.thumbnail_url} style={{width:48,height:36,borderRadius:6,objectFit:'cover'}} alt=""/>:<div style={{width:48,height:36,borderRadius:6,background:'#f0f0f0'}}/>}
  <div style={{flex:1,minWidth:0}}>
  <div style={{fontSize:13,fontWeight:500,color:'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.report?.title||'Unknown report'}</div>
  <div style={{fontSize:11,color:'#888'}}>{sourceLabels[e.source]||e.source} · {new Date(e.created_at).toLocaleDateString()}</div>
  </div>
  <div style={{textAlign:'right'}}>
  <div style={{fontSize:14,fontWeight:600,color:e.paid_out?'#888':'#22C55E'}}>${e.amount.toFixed(2)}</div>
  <div style={{fontSize:10,color:held?'#EAB308':e.paid_out?'#888':'#22C55E'}}>{e.paid_out?'Paid':held?'On hold':'Available'}</div>
  </div>
  </div>)
})}

<div style={{textAlign:'center',marginTop:16}}><a href="/payouts" style={{color:BRAND.blue,fontSize:13,fontWeight:500,textDecoration:'none'}}>Go to Payouts →</a></div>
</div>
</div>)
}
