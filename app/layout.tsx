import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BizLink PM',
  description: 'Preventive Maintenance System',
}

// Paksa lebar halaman 980px di HP (tampilan seperti desktop, bisa di-zoom)
export const viewport: Viewport = {
  width: 980,
  initialScale: undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}