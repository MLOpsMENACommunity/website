import type { Metadata } from 'next'
import PartnersView from '@/views/PartnersView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').partnersPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/partners',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnPartnersPage() {
  return <PartnersView lang="en" />
}
