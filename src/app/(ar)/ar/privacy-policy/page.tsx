import type { Metadata } from 'next'
import PrivacyView from '@/views/PrivacyView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').privacyPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/ar/privacy-policy',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArPrivacyPage() {
  return <PrivacyView lang="ar" />
}
