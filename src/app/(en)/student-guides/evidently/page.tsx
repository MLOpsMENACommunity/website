import type { Metadata } from 'next'
import EvidentlyGuideView from '@/views/EvidentlyGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/evidently',
  title: 'Evidently Learning Path: Beginner to Advanced',
  description: 'Learn Evidently from first drift report to secure, scalable ML monitoring platform governance.',
})

export default function EnEvidentlyGuidePage() {
  return <EvidentlyGuideView lang="en" />
}
