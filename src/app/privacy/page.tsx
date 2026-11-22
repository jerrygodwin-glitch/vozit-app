import PolicyPage from '@/components/PolicyPage'
import { content as en } from '@/lib/translations/policies/privacy/en'
import { content as es } from '@/lib/translations/policies/privacy/es'
import { content as ar } from '@/lib/translations/policies/privacy/ar'
import { content as fr } from '@/lib/translations/policies/privacy/fr'
import { content as uk } from '@/lib/translations/policies/privacy/uk'
import { content as pt } from '@/lib/translations/policies/privacy/pt'

export const metadata = {
  title: 'Privacy Policy — VozIt!',
  description: 'How VozIt! collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return <PolicyPage contentByLang={{ en, es, ar, fr, uk, pt }} />
}
