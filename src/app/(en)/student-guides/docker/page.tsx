import type { Metadata } from 'next'
import DockerGuideView from '@/views/DockerGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/docker',
  title: 'The Complete Docker Guide',
  description: 'A practical Docker guide in 26 sections: core container concepts, Dockerfiles, layer caching, Compose, networking, volumes, security, debugging, image optimization, machine-learning images, CI/CD delivery, orchestration, and a troubleshooting reference.',
})

export default function EnDockerGuidePage() {
  return <DockerGuideView lang="en" />
}
