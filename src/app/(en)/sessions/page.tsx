import type { Metadata } from 'next'
import SessionsView from '@/views/SessionsView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').sessionsPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/sessions',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnSessionsPage() {
  return <SessionsView lang="en" />
}
