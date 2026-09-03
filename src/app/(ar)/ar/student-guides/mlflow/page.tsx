import type { Metadata } from 'next'
import MlflowGuideView from '@/views/MlflowGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/mlflow',
  title: 'The Complete MLflow Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن MLflow تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArMlflowGuidePage() {
  return <MlflowGuideView lang="ar" />
}
