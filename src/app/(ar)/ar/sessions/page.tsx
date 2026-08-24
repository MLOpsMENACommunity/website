import type { Metadata } from 'next'
import SessionsView from '@/views/SessionsView'
import { t } from '@/lib/i18n'

const copy = t('ar').sessionsPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/ar/sessions/', languages: { en: '/sessions/', ar: '/ar/sessions/' } },
}

export default function ArSessionsPage() {
  return <SessionsView lang="ar" />
}
