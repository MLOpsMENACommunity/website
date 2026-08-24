import type { Metadata } from 'next'
import RoadmapsView from '@/views/RoadmapsView'
import { t } from '@/lib/i18n'

const copy = t('en').roadmapsPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/roadmaps/', languages: { en: '/roadmaps/', ar: '/ar/roadmaps/' } },
}

export default function RoadmapsPage() {
  return <RoadmapsView lang="en" />
}
