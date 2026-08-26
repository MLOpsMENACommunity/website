import type { Metadata } from 'next'
import RoadmapsView from '@/views/RoadmapsView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').roadmapsPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/roadmaps',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArRoadmapsPage() {
  return <RoadmapsView lang="ar" />
}
