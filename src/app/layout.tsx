import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { site } from '~/site.config'
import { asset } from '@/lib/asset'
import { themeScript } from '@/lib/theme'
import { t } from '@/lib/i18n'
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
  alternates: {
    canonical: '/',
    languages: { en: '/', ar: '/ar/' },
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — Free AI & MLOps education for MENA`,
    description: site.description,
    images: [asset('/logo-full.png')],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
    images: [asset('/logo-full.png')],
  },
  icons: { icon: asset('/logo-mark.png'), apple: asset('/logo-mark.png') },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const copy = t('en')
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          {copy.nav.skipToContent}
        </a>
        <Nav lang="en" />
        <main id="main" className="pt-16">{children}</main>
        <Footer lang="en" />
      </body>
    </html>
  )
}
