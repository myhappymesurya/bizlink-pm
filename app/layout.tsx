import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BizLink PM System',
  description: 'Enterprise CMMS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}