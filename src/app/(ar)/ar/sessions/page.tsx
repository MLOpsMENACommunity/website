import type { Metadata } from 'next'
import SessionsView from '@/views/SessionsView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').sessionsPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/sessions',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArSessionsPage() {
  return <SessionsView lang="ar" />
}
