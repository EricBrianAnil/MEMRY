import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MEMRY — WiFi e-ink fridge magnet',
  description: 'A digital showroom for memories',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}