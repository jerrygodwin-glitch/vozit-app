// @ts-nocheck
import { createServerClient as s } from '@supabase/ssr'
import { cookies } from 'next/headers'
const U='https://mfanqkbhegxppyitxtye.supabase.co'
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYW5xa2JoZWd4cHB5aXR4dHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDc2NDYsImV4cCI6MjEwMzcyMzY0Nn0.83-3UqR1BH2uaVoTO7Gta0l3lxVlkh7qSZ0b20aszdw'
export const createServerClient=()=>s(U,K,{cookies:{async getAll(){const c=await cookies();return c.getAll()},async setAll(v){try{const c=await cookies();for(const{name,value,options}of v)c.set(name,value,options)}catch{}}}})
export const createAdminClient=()=>null
