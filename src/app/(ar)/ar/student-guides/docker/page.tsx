import type { Metadata } from 'next'
import DockerGuideView from '@/views/DockerGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/docker',
  title: 'The Complete Docker Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن Docker تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArDockerGuidePage() {
  return <DockerGuideView lang="ar" />
}
