// Shared content shape for the multi-language policy pages (Terms of
// Service, Privacy Policy, Reporter & Contributor Agreement — the three
// "critical" documents translated for launch). A paragraph can carry a bold
// lead-in label (matching the original pages' "Account information." style
// definitions) without needing raw JSX/markup in translated data.
export type PolicyLang = 'en' | 'es' | 'ar' | 'fr' | 'uk' | 'pt'

export const POLICY_LANGS: { code: PolicyLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'uk', label: 'Українська' },
  { code: 'pt', label: 'Português' },
]

export type PolicyParagraph = string | { label: string; text: string }

export interface PolicyTable {
  headers: string[]
  rows: string[][]
}

export interface PolicySection {
  heading: string
  paragraphs?: PolicyParagraph[]
  list?: string[]
  table?: PolicyTable
}

export interface PolicyContent {
  title: string
  updatedLabel: string
  intro: string[]
  sections: PolicySection[]
  contactLabel: string
  // Set only on non-English translations — rendered by the disclaimer
  // banner, not used for English itself.
  aiTranslatedLabel?: string
  viewInEnglishLabel?: string
  viewInEnglishLinkText?: string
}
