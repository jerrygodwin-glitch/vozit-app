'use client'
import{useState}from'react'
import{createBrowserClient}from'@/lib/supabase'
export default function Login(){
const sb=createBrowserClient()
const[email,setEmail]=useState('')
const[pw,setPw]=useState('')
const[loading,setLoading]=useState(false)
const[err,setErr]=useState('')
async function go(e){e.preventDefault();setLoading(true);setErr('')
try{const{error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;window.location.href='/feed'}catch(e){setErr(e.message||'Login failed')}finally{setLoading(false)}}
return(<div style={{minHeight:'100vh',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}><div style={{background:'#fff',borderRadius:10,padding:28,maxWidth:400,width:'100%',border:'1px solid #f0f0f0'}}><div style={{textAlign:'center',marginBottom:24}}><div style={{width:64,height:64,borderRadius:14,background:'linear-gradient(135deg,#FE3D07,#ff6b3d)',margin:'0 auto 8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:24,fontWeight:900}}>V</div><h2 style={{fontSize:20,fontWeight:700,color:'#1a1a1a',margin:0}}>Welcome back</h2></div>{err&&<div style={{background:'#FEF2F2',color:'#DC2626',padding:10,borderRadius:8,fontSize:13,marginBottom:12}}>{err}</div>}<form onSubmit={go}><input type='email' value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email' required style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:14,marginBottom:14,outline:'none',boxSizing:'border-box'}}/><input type='password' value={pw} onChange={e=>setPw(e.target.value)} placeholder='Password' required style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:14,marginBottom:16,outline:'none',boxSizing:'border-box'}}/><button type='submit' disabled={loading} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:loading?'#ccc':'#FE3D07',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>{loading?'Signing in...':'Sign in'}</button></form><p style={{textAlign:'center',fontSize:13,color:'#999',marginTop:16}}>No account? <a href='/auth/register' style={{color:'#FE3D07',fontWeight:600,textDecoration:'none'}}>Sign up</a></p></div></div>)}
