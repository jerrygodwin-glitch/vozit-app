// @ts-nocheck
'use client'
import{useState}from'react'
import Link from'next/link'
const TC:Record<string,{c:string,bg:string,l:string}>={starter:{c:'#22C55E',bg:'#ECFDF5',l:'Starter'},silver:{c:'#94A3B8',bg:'#F0F4F8',l:'Silver'},gold:{c:'#EAB308',bg:'#FFF8E6',l:'Gold'},platinum:{c:'#8B5CF6',bg:'#F5F0FF',l:'Platinum'}}
const REGIONS=['America','Europe','Middle East','Asia','Africa']
export function FeedClient({reports:initialReports,pageSize=30}:{reports:any[],pageSize?:number}){
  const[reports,setReports]=useState(initialReports)
  const[loading,setLoading]=useState(false)
  const[hasMore,setHasMore]=useState(initialReports.length>=pageSize)

  async function loadMore(){
    if(loading)return
    setLoading(true)
    try{
      const res=await fetch(`/api/reports?limit=${pageSize}&offset=${reports.length}`)
      const data=await res.json()
      const more=data.reports||[]
      // New pages aren't run through the series-collapsing pass the initial
      // server-rendered page does, so a multi-part story past the first
      // page may show its individual updates instead of one collapsed card.
      setReports(prev=>[...prev,...more])
      if(more.length<pageSize)setHasMore(false)
    }catch{setHasMore(false)}
    setLoading(false)
  }

  // Location text rarely spells out the continent name literally (e.g. "Kharkiv,
  // Ukraine" won't match "Europe"), so anything that doesn't match a region falls
  // into a catch-all instead of silently disappearing from the feed.
  const grouped=REGIONS.reduce((acc,r)=>{acc[r]=reports.filter(rp=>(rp.location_name||'').toLowerCase().includes(r.toLowerCase()));return acc},{} as Record<string,any[]>)
  const matchedIds=new Set(Object.values(grouped).flat().map((r:any)=>r.id))
  const other=reports.filter(r=>!matchedIds.has(r.id))
  const sections=other.length?[...REGIONS,'Other']:REGIONS
  const allGrouped={...grouped,Other:other}
  return(<div style={{padding:'8px 0 60px',maxWidth:600,margin:'0 auto',width:'100%'}}>
    {sections.map(region=>{const items=allGrouped[region]||[];return(<div key={region}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 8px 0 12px',margin:'6px 10px 4px',background:'#FE3D07',borderRadius:6,height:30}}>
        <span style={{fontSize:14,fontWeight:700,color:'#fff'}}>{region}</span>
        <button style={{backgroundColor:'#fff',color:'#0a8fe8',border:'none',padding:'3px 12px',borderRadius:4,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',lineHeight:'1.5',boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>Contribute</button>
      </div>
      {items.length?items.map(r=>{const t=TC[r.user?.tier||'starter']||TC.starter;return(
        <Link key={r.id} href={'/report/'+r.id} style={{display:'flex',borderBottom:'1px solid #f0f0f0',textDecoration:'none'}}>
          <div style={{width:130,minHeight:80,background:'linear-gradient(135deg,#5a6a7a,#3a4a5a)',position:'relative',flexShrink:0}}>
            {r.thumbnail_url&&<img src={r.thumbnail_url} alt='' style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:32,height:32,borderRadius:16,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:0,height:0,borderLeft:'10px solid #fff',borderTop:'6px solid transparent',borderBottom:'6px solid transparent',marginLeft:2}}/></div>
          </div>
          <div style={{flex:1,padding:'3px 10px 4px',minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1a1a1a',lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.update_count>1&&<span style={{color:'#FE3D07',marginRight:4}}>{'\u{1F534}'} {r.update_count} updates {'·'} </span>}{r.title}</div>
            <div style={{fontSize:11,color:'#888',lineHeight:1.3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.what||r.title}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:2}}>
              <span style={{fontSize:11,color:'#00AACC',fontWeight:500}}>{new Date(r.created_at).toLocaleDateString()}</span>
              <span style={{fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:3}}>@{r.user?.username} <span style={{fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,background:t.bg,color:t.c}}>{'\u2605'} {t.l}</span></span>
            </div>
          </div>
        </Link>
      )}):<div style={{padding:'16px 12px',fontSize:13,color:'#999',textAlign:'center'}}>No reports yet from this region</div>}
    </div>)})}
    {hasMore&&<div style={{textAlign:'center',padding:'16px 12px'}}>
      <button onClick={loadMore} disabled={loading} style={{padding:'10px 24px',borderRadius:8,border:'1px solid #eee',background:'#fff',color:'#333',fontSize:13,fontWeight:600,cursor:loading?'default':'pointer',fontFamily:'inherit',opacity:loading?0.5:1}}>
        {loading?'Loading...':'Load more'}
      </button>
    </div>}
  </div>)
}
