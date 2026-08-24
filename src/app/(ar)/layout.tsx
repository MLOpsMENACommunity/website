import type { Metadata } from 'next'
import RootShell from '@/views/RootShell'
import { site } from '~/site.config'
import { asset } from '@/lib/asset'
import { t } from '@/lib/i18n'
import '../globals.css'

const copy = t('ar')

const titleAr = 'مجتمع MLOps MENA — تعليم مجاني في الذكاء الاصطناعي وMLOps'
const descriptionAr = copy.home.hero.lead

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: titleAr,
    template: `%s · MLOps MENA`,
  },
  description: descriptionAr,
  keywords: ['MLOps', 'الشرق الأوسط', 'تعلم آلي', 'ذكاء اصطناعي', 'دورة مجانية', 'خريطة تعلم', 'مصر'],
  alternates: {
    canonical: '/ar/',
    languages: { 'en': '/', 'ar': '/ar/', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'ar_EG',
    title: titleAr,
    description: descriptionAr,
    images: [asset('/logo-full.png')],
  },
  twitter: {
    card: 'summary_large_image',
    title: titleAr,
    description: descriptionAr,
    images: [asset('/logo-full.png')],
  },
  icons: { icon: asset('/logo-mark.png'), apple: asset('/logo-mark.png') },
}

export default function ArLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ar">{children}</RootShell>
}
