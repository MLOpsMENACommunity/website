import type { Metadata } from 'next'
import RoadmapsView from '@/views/RoadmapsView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').roadmapsPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/roadmaps',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function RoadmapsPage() {
  return <RoadmapsView lang="en" />
}
