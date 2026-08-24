import type { Metadata } from 'next'
import TeamView from '@/views/TeamView'
import { t } from '@/lib/i18n'

const copy = t('en').teamPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/team/', languages: { en: '/team/', ar: '/ar/team/' } },
}

export default function EnTeamPage() {
  return <TeamView lang="en" />
}
