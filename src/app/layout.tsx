// @ts-nocheck
import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'VozIt \u2014 I was there', description: 'Citizen journalism platform' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#fff', margin: 0 }}>{children}</body>
    </html>
  )
}
