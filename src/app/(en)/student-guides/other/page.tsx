import type { Metadata } from 'next'
import OtherQuickStartView from '@/views/OtherQuickStartView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').studentGuidesPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/other',
  title: copy.otherQuickStart,
  description: copy.otherQuickStartLead,
})

export default function EnOtherQuickStartPage() {
  return <OtherQuickStartView lang="en" />
}
