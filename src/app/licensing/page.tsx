import LicensingClient from './LicensingClient'

// A server component wrapper so this page can export real metadata — a
// 'use client' file (what this used to be, in full) can't export metadata
// at all. The actual page content/interactivity lives in LicensingClient.tsx
// unchanged; this file only adds the metadata a server component can carry.
export const metadata = {
  title: 'Licensing — VozIt!',
  description: 'License verified citizen journalism footage for your newsroom. Revenue is shared with the reporter who captured it.',
}

export default function LicensingPage() {
  return <LicensingClient />
}
