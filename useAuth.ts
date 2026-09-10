// @ts-nocheck
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type { User } from '@/types'

export function useAuth() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const { data: { user: au } } = await supabase.auth.getUser()
    if (au) {
      const { data } = await supabase.from('users').select('*').eq('id', au.id).single()
      setUser(data as User)
    } else { setUser(null) }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    refreshUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refreshUser())
    return () => subscription.unsubscribe()
  }, [supabase, refreshUser])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null); router.push('/auth/login'); router.refresh()
  }, [supabase, router])

  return { user, loading, signOut, refreshUser }
}
