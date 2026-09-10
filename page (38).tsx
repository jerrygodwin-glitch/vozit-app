// @ts-nocheck
'use client'
import{useState,useEffect}from'react'
import{createBrowserClient}from'@/lib/supabase'
import{VOZIT_LOGO,BRAND}from'@/lib/logo'
import{NavBar}from'@/components/ui/NavBar'
import{PAYOUT_PROVIDERS}from'@/lib/payouts'

type Balance={available:number;pending:number;total:number}
type Payout={id:string;amount:number;provider:string;status:string;transaction_id?:string;created_at:string;completed_at?:string}

export default function PayoutsPage(){
const sb=createBrowserClient()
const[balance,setBalance]=useState<Balance>({available:0,pending:0,total:0})
const[provider,setProvider]=useState('')
const[payouts,setPayouts]=useState<Payout[]>([])
const[amount,setAmount]=useState('')
const[loading,setLoading]=useState(true)
const[requesting,setRequesting]=useState(false)
const[result,setResult]=useState<{ok:boolean;msg:string}|null>(null)
const[tier,setTier]=useState('starter')
const[showProviders,setShowProviders]=useState(false)

useEffect(()=>{
  fetch('/api/payouts').then(r=>r.json()).then(d=>{
    setBalance(d.balance||{available:0,pending:0,total:0})
    setProvider(d.provider||'')
    setPayouts(d.payouts||[])
    setTier(d.tier||'starter')
    setLoading(false)
  }).catch(()=>setLoading(false))
},[])

async function requestPayout(){
  const amt=parseFloat(amount)
  if(!amt||amt<=0)return
  setRequesting(true);setResult(null)
  try{
    const r=await fetch('/api/payouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'payout',amount:amt,provider})})
    const d=await r.json()
    if(d.ok){
      setResult({ok:true,msg:d.status==='pending_review'?'Payout pending compliance review (1-2 business days).':`$${amt.toFixed(2)} sent via ${provider}!`})
      setBalance(b=>({...b,available:b.available-amt}))
      setAmount('')
      fetch('/api/payouts').then(r=>r.json()).then(d=>setPayouts(d.payouts||[]))
    }else{
      setResult({ok:false,msg:d.error||d.reason||'Payout failed'})
    }
  }catch(e:any){setResult({ok:false,msg:e.message})}
  setRequesting(false)
}

async function changeProvider(p:string){
  await fetch('/api/payouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect',provider:p})})
  setProvider(p);setShowProviders(false)
}

const minPayout=PAYOUT_PROVIDERS[provider as keyof typeof PAYOUT_PROVIDERS]?.minPayout||10
const providerInfo=PAYOUT_PROVIDERS[provider as keyof typeof PAYOUT_PROVIDERS]
const tierColors:Record<string,string>={starter:'#22C55E',silver:'#94A3B8',gold:'#EAB308',platinum:'#8B5CF6'}
const tierShares:Record<string,string>={starter:'50%',silver:'55%',gold:'65%',platinum:'70%'}

if(loading)return<div style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center'}}><p style={{color:'#888'}}>Loading...</p></div>

return(<div style={{minHeight:'100vh',background:'#f5f5f5'}}>
<NavBar/>
<div style={{maxWidth:520,margin:'0 auto',padding:'80px 16px 100px'}}>
<h1 style={{fontSize:20,fontWeight:600,color:'#1a1a1a',marginBottom:4}}>Payouts</h1>
<p style={{fontSize:13,color:'#888',marginBottom:20}}>Withdraw your earnings. 7-day hold on new revenue.</p>

{/* Balance cards */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
<div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #eee'}}>
<div style={{fontSize:11,color:'#888',marginBottom:4}}>Available</div>
<div style={{fontSize:22,fontWeight:700,color:'#22C55E'}}>${balance.available.toFixed(2)}</div>
</div>
<div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #eee'}}>
<div style={{fontSize:11,color:'#888',marginBottom:4}}>Pending (7-day hold)</div>
<div style={{fontSize:22,fontWeight:700,color:'#EAB308'}}>${balance.pending.toFixed(2)}</div>
</div>
<div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #eee'}}>
<div style={{fontSize:11,color:'#888',marginBottom:4}}>Total earned</div>
<div style={{fontSize:22,fontWeight:700,color:'#1a1a1a'}}>${balance.total.toFixed(2)}</div>
</div>
</div>

{/* Tier info */}
<div style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid #eee',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
<div style={{width:10,height:10,borderRadius:5,background:tierColors[tier]}}/>
<div style={{flex:1}}>
<span style={{fontSize:13,fontWeight:600,color:'#1a1a1a'}}>{tier.charAt(0).toUpperCase()+tier.slice(1)} tier</span>
<span style={{fontSize:12,color:'#888',marginLeft:8}}>— {tierShares[tier]} revenue share</span>
</div>
</div>

{/* Withdraw form */}
<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',marginBottom:20}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:12}}>Request withdrawal</div>

{/* Provider selector */}
<div style={{marginBottom:14}}>
<div style={{fontSize:11,color:'#888',marginBottom:6}}>Payout method</div>
{provider?(
<div onClick={()=>setShowProviders(!showProviders)} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #eee',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div><span style={{fontSize:16,marginRight:8}}>{providerInfo?.icon}</span><span style={{fontSize:13,fontWeight:500,color:'#1a1a1a'}}>{providerInfo?.name}</span><span style={{fontSize:11,color:'#888',marginLeft:8}}>Min ${minPayout}</span></div>
<span style={{fontSize:12,color:'#0a8fe8'}}>Change</span>
</div>
):(
<div onClick={()=>setShowProviders(true)} style={{padding:'10px 14px',borderRadius:8,border:'1px dashed #ddd',cursor:'pointer',textAlign:'center',color:'#888',fontSize:13}}>Select payout method</div>
)}
{showProviders&&<div style={{marginTop:8,border:'1px solid #eee',borderRadius:8,overflow:'hidden'}}>
{Object.entries(PAYOUT_PROVIDERS).map(([id,p])=>(
<div key={id} onClick={()=>changeProvider(id)} style={{padding:'10px 14px',borderBottom:'1px solid #f0f0f0',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:provider===id?'#EFF8FF':'#fff'}}>
<span style={{fontSize:18}}>{p.icon}</span>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:500}}>{p.name}</div><div style={{fontSize:10,color:'#888'}}>{p.description}</div></div>
{provider===id&&<span style={{color:'#0a8fe8',fontWeight:700}}>✓</span>}
</div>
))}
</div>}
</div>

{/* Amount input */}
<div style={{marginBottom:14}}>
<div style={{fontSize:11,color:'#888',marginBottom:6}}>Amount (USD)</div>
<div style={{display:'flex',gap:8}}>
<div style={{position:'relative',flex:1}}>
<span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#888',fontSize:16}}>$</span>
<input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`${minPayout}.00`} min={minPayout} max={balance.available} step="0.01" style={{width:'100%',padding:'10px 14px 10px 28px',borderRadius:8,border:'1px solid #ddd',fontSize:16,fontWeight:600,outline:'none',fontFamily:'inherit'}}/>
</div>
<button onClick={()=>setAmount(balance.available.toFixed(2))} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #eee',background:'#fafafa',cursor:'pointer',fontSize:12,color:'#0a8fe8',fontWeight:500,fontFamily:'inherit',whiteSpace:'nowrap'}}>Max</button>
</div>
</div>

{/* Submit */}
<button onClick={requestPayout} disabled={requesting||!provider||!amount||parseFloat(amount)<minPayout||parseFloat(amount)>balance.available} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:BRAND.orange,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:(requesting||!provider||!amount||parseFloat(amount)<minPayout||parseFloat(amount)>balance.available)?0.4:1}}>{requesting?'Processing...':'Withdraw'}</button>

{result&&<div style={{marginTop:12,padding:12,borderRadius:8,background:result.ok?'#ECFDF5':'#FEF2F2',color:result.ok?'#065F46':'#991B1B',fontSize:13}}>{result.msg}</div>}

<div style={{fontSize:10,color:'#aaa',textAlign:'center',marginTop:10}}>VozIt absorbs all payout fees. OFAC compliance screening on every withdrawal.</div>
</div>

{/* Payout history */}
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:10}}>History</div>
{payouts.length===0?<div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee',textAlign:'center',color:'#888',fontSize:13}}>No payouts yet</div>:
payouts.map(p=>(
<div key={p.id} style={{background:'#fff',borderRadius:10,padding:14,border:'1px solid #eee',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
<span style={{fontSize:20}}>{PAYOUT_PROVIDERS[p.provider as keyof typeof PAYOUT_PROVIDERS]?.icon||'💰'}</span>
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:600,color:'#1a1a1a'}}>${p.amount.toFixed(2)}</div>
<div style={{fontSize:11,color:'#888'}}>{PAYOUT_PROVIDERS[p.provider as keyof typeof PAYOUT_PROVIDERS]?.name||p.provider} · {new Date(p.created_at).toLocaleDateString()}</div>
</div>
<span style={{fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:4,background:p.status==='completed'?'#ECFDF5':p.status==='failed'?'#FEF2F2':'#FFF8E6',color:p.status==='completed'?'#065F46':p.status==='failed'?'#991B1B':'#92400E'}}>{p.status}</span>
</div>
))}
</div>
</div>)
}
