import type { Metadata } from 'next'
import SessionsView from '@/views/SessionsView'
import { t } from '@/lib/i18n'

const copy = t('en').sessionsPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/sessions/', languages: { en: '/sessions/', ar: '/ar/sessions/' } },
}

export default function EnSessionsPage() {
  return <SessionsView lang="en" />
}
