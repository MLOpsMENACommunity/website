import type { Metadata } from 'next'
import OtherQuickStartView from '@/views/OtherQuickStartView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').studentGuidesPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/other',
  title: copy.otherQuickStart,
  description: copy.otherQuickStartLead,
})

export default function ArOtherQuickStartPage() {
  return <OtherQuickStartView lang="ar" />
}
