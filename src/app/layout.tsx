import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { site } from '~/site.config'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Free AI & MLOps education for MENA`,
    template: `%s · ${site.shortName}`,
  },
  description: site.description,
  keywords: ['MLOps', 'MENA', 'machine learning', 'AI', 'free course', 'roadmap', 'Egypt', 'production ML'],
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — Free AI & MLOps education for MENA`,
    description: site.description,
    images: ['/logo-full.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
    images: ['/logo-full.png'],
  },
  icons: { icon: '/logo-mark.png', apple: '/logo-mark.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main" className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
