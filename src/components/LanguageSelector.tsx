'use client'
import { POLICY_LANGS, type PolicyLang } from '@/lib/translations/policies/types'

export const POLICY_LANG_STORAGE_KEY = 'vozit_policy_lang'

export function readStoredPolicyLang(): PolicyLang {
  try {
    const stored = localStorage.getItem(POLICY_LANG_STORAGE_KEY)
    if (stored && POLICY_LANGS.some(l => l.code === stored)) return stored as PolicyLang
  } catch {}
  return 'en'
}

export default function LanguageSelector({ value, onChange }: { value: PolicyLang; onChange: (lang: PolicyLang) => void }) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value as PolicyLang
    try { localStorage.setItem(POLICY_LANG_STORAGE_KEY, lang) } catch {}
    onChange(lang)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      aria-label="Select language"
      style={{
        fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd',
        background: '#fff', color: '#333', fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      {POLICY_LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  )
}
