// @ts-nocheck
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
export default async function RootPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  redirect(session ? '/feed' : '/auth/login')
}
