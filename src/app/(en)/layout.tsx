import type { Metadata } from 'next'
import RootShell from '@/views/RootShell'
import { site } from '~/site.config'
import { asset } from '@/lib/asset'
import '../globals.css'

/** Same card `pageMetadata` uses, so every page reports identical dimensions. */
const card = { url: asset('/logo-full.png'), width: 1200, height: 670, alt: site.name }

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
    languages: { 'en': '/', 'ar': '/ar/', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: site.name,
    locale: 'en_US',
    title: `${site.name} — Free AI & MLOps education for MENA`,
    description: site.description,
    images: [card],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
    images: [card],
  },
  icons: { icon: asset('/logo-mark.png'), apple: asset('/logo-mark.png') },
}

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
