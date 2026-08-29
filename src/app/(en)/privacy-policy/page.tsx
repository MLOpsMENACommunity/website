import type { Metadata } from 'next'
import PrivacyView from '@/views/PrivacyView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').privacyPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/privacy-policy',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnPrivacyPage() {
  return <PrivacyView lang="en" />
}
