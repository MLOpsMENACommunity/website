import type { Metadata } from 'next'
import RagasGuideView from '@/views/RagasGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/ragas',
  title: 'RAGAS Learning Path: Beginner to Advanced',
  description: 'Learn RAGAS at your level: evaluate a RAG pipeline, build calibrated regression gates, or govern a secure multi-team evaluation platform.',
})

export default function EnRagasGuidePage() {
  return <RagasGuideView lang="en" />
}
