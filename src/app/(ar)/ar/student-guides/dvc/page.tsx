import type { Metadata } from 'next'
import DvcGuideView from '@/views/DvcGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/dvc',
  title: 'The Complete DVC Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن DVC تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArDvcGuidePage() {
  return <DvcGuideView lang="ar" />
}
