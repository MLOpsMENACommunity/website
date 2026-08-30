import type { Metadata } from 'next'
import DockerGuideView from '@/views/DockerGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/docker',
  title: 'The Complete Docker Guide',
  description: 'دليل عملي باللغة الإنجليزية لتعلّم Docker في 26 قسمًا: من أساسيات الحاويات إلى Compose والشبكات والتخزين والأمان وتحسين الصور وصور تعلّم الآلة والتسليم عبر CI/CD والتشغيل في الإنتاج ومرجع لحل المشكلات.',
})

export default function ArDockerGuidePage() {
  return <DockerGuideView lang="ar" />
}
