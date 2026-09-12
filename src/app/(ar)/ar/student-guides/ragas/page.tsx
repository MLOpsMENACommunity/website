import type { Metadata } from 'next'
import RagasGuideView from '@/views/RagasGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/ragas',
  title: 'RAGAS Learning Path: Beginner to Advanced',
  description: 'English RAGAS learning path for three experience levels: core evaluation, reliable regression gates, and secure platform governance.',
})

export default function ArRagasGuidePage() {
  return <RagasGuideView lang="ar" />
}
