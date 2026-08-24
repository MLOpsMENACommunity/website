import type { Metadata } from 'next'
import RootShell from '@/views/RootShell'
import { site } from '~/site.config'
import { asset } from '@/lib/asset'
import '../globals.css'

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
    siteName: site.name,
    locale: 'en_US',
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

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>
}
