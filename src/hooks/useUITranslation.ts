// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

// Renders a page's English copy immediately (so there's never a loading
// blank), then swaps in translated copy once it arrives — for reporters
// whose account's primary language (set once, in the Telegram bot) isn't
// English. Falls back to English permanently if the translation call
// fails, rather than leaving the page in a broken half-translated state.
export function useUITranslation<T extends Record<string, string>>(pageKey: string, defaults: T): T {
  const { user } = useAuth()
  const [strings, setStrings] = useState<T>(defaults)
  const lang = user?.telegram_language

  useEffect(() => {
    if (!lang || lang === 'en') { setStrings(defaults); return }
    let cancelled = false
    fetch('/api/translate-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageKey, lang, strings: defaults }),
    })
      .then(r => r.json())
      .then(json => { if (!cancelled && json?.translated) setStrings(json.translated) })
      .catch(() => {})
    return () => { cancelled = true }
    // defaults is a fresh object every render by design (inline literals at
    // each call site) — keying off pageKey/lang only is intentional so this
    // doesn't re-fetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, lang])

  return strings
}
