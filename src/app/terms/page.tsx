import PolicyPage from '@/components/PolicyPage'
import { content as en } from '@/lib/translations/policies/terms/en'
import { content as es } from '@/lib/translations/policies/terms/es'
import { content as ar } from '@/lib/translations/policies/terms/ar'
import { content as fr } from '@/lib/translations/policies/terms/fr'
import { content as uk } from '@/lib/translations/policies/terms/uk'
import { content as pt } from '@/lib/translations/policies/terms/pt'

export const metadata = {
  title: 'Terms of Service — VozIt!',
  description: 'The terms that govern use of VozIt!.',
}

export default function TermsPage() {
  return <PolicyPage contentByLang={{ en, es, ar, fr, uk, pt }} />
}
