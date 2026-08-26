import type { Metadata } from 'next'
import TeamView from '@/views/TeamView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').teamPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/team',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnTeamPage() {
  return <TeamView lang="en" />
}
