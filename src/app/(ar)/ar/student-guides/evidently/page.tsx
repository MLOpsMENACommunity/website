import type { Metadata } from 'next'
import EvidentlyGuideView from '@/views/EvidentlyGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/evidently',
  title: 'Evidently Learning Path: Beginner to Advanced',
  description: 'English Evidently learning path for data quality, drift monitoring, production pipelines, and platform governance.',
})

export default function ArEvidentlyGuidePage() {
  return <EvidentlyGuideView lang="ar" />
}
