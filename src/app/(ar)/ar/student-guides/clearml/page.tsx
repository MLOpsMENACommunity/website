import type { Metadata } from 'next'
import ClearMLGuideView from '@/views/ClearMLGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/clearml',
  title: 'The Complete ClearML Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن ClearML تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArClearMLGuidePage() {
  return <ClearMLGuideView lang="ar" />
}
