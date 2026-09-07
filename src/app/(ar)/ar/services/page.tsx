import type { Metadata } from 'next'
import ServicesView from '@/views/ServicesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').servicesPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/services',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArServicesPage() {
  return <ServicesView lang="ar" />
}
