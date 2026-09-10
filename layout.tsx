import './globals.css'

export const metadata = {
  title: 'VozIt! — I was there...',
  description: 'Citizen journalism platform — report what you see, earn what you capture',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0a3ff1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
