import type { Metadata } from 'next'
import FaqView from '@/views/FaqView'
import { t } from '@/lib/i18n'

const copy = t('en').faqPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/faq/', languages: { en: '/faq/', ar: '/ar/faq/' } },
}

export default function EnFaqPage() {
  return <FaqView lang="en" />
}
