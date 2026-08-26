import type { Metadata } from 'next'
import FaqView from '@/views/FaqView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').faqPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/faq',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnFaqPage() {
  return <FaqView lang="en" />
}
