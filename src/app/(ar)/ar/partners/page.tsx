import type { Metadata } from 'next'
import PartnersView from '@/views/PartnersView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').partnersPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/partners',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArPartnersPage() {
  return <PartnersView lang="ar" />
}
