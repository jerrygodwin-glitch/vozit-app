import PolicyPage from '@/components/PolicyPage'
import { content as en } from '@/lib/translations/policies/contributor/en'
import { content as es } from '@/lib/translations/policies/contributor/es'
import { content as ar } from '@/lib/translations/policies/contributor/ar'
import { content as fr } from '@/lib/translations/policies/contributor/fr'
import { content as uk } from '@/lib/translations/policies/contributor/uk'
import { content as pt } from '@/lib/translations/policies/contributor/pt'

export const metadata = {
  title: 'Reporter & Contributor Agreement — VozIt!',
  description: 'What you certify when you submit a report, and how revenue-sharing works.',
}

export default function ContributorAgreementPage() {
  return <PolicyPage contentByLang={{ en, es, ar, fr, uk, pt }} />
}
