// @ts-nocheck
'use client'
import{Suspense}from'react'
import{useSearchParams}from'next/navigation'
import{VOZIT_LOGO}from'@/lib/logo'
function V(){const p=useSearchParams();const email=p.get('email')||'your email';return(<div style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}><div className='card' style={{padding:28,maxWidth:400,width:'100%',textAlign:'center'}}><img src={VOZIT_LOGO} alt='VozIt' style={{height:64,width:64,borderRadius:14,margin:'0 auto 16px'}}/><h2 style={{fontSize:20,fontWeight:700,color:'#1a1a1a',marginBottom:8}}>Check your email</h2><p style={{fontSize:14,color:'#888',marginBottom:16}}>We sent a link to <strong>{email}</strong></p><a href='/auth/login' style={{color:'#FE3D07',fontWeight:600,textDecoration:'none',fontSize:14}}>Back to sign in</a></div></div>)}
export default function P(){return <Suspense><V/></Suspense>}
