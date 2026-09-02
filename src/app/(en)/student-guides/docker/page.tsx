import type { Metadata } from 'next'
import DockerGuideView from '@/views/DockerGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/docker',
  title: 'The Complete Docker Guide',
  description: 'A complete Docker course taught at three levels. Choose Beginner, Mid-level, or Senior, then read the full explanation with worked examples, a fast interview review, or the practical tips and traps for that level.',
})

export default function EnDockerGuidePage() {
  return <DockerGuideView lang="en" />
}
