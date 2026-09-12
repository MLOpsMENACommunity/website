import type { Metadata } from 'next'
import LangfuseGuideView from '@/views/LangfuseGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/langfuse',
  title: 'Langfuse Learning Path: Beginner to Advanced',
  description: 'English Langfuse learning path for three experience levels: first traces, reliable production observability, and multi-team platform governance.',
})

export default function ArLangfuseGuidePage() {
  return <LangfuseGuideView lang="ar" />
}
