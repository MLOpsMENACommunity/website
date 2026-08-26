import type { Metadata } from 'next'
import FaqView from '@/views/FaqView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').faqPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/faq',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArFaqPage() {
  return <FaqView lang="ar" />
}
