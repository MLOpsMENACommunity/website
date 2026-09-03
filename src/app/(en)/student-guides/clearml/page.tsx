import type { Metadata } from 'next'
import ClearMLGuideView from '@/views/ClearMLGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/clearml',
  title: 'The Complete ClearML Guide',
  description: 'A complete ClearML course taught at three levels. Choose Beginner, Mid-level, or Senior, then read the full explanation with worked examples, a fast interview review, or the practical tips and traps for that level.',
})

export default function EnClearMLGuidePage() {
  return <ClearMLGuideView lang="en" />
}
