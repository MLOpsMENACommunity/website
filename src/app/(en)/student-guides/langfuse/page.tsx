import type { Metadata } from 'next'
import LangfuseGuideView from '@/views/LangfuseGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/langfuse',
  title: 'Langfuse Learning Path: Beginner to Advanced',
  description: 'Learn Langfuse at your level: build a first trace, operate reliable production observability, or design governance for a multi-team evaluation platform.',
})

export default function EnLangfuseGuidePage() {
  return <LangfuseGuideView lang="en" />
}
