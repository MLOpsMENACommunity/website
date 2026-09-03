import type { Metadata } from 'next'
import AirflowGuideView from '@/views/AirflowGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/airflow',
  title: 'The Complete Airflow Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن Apache Airflow تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArAirflowGuidePage() {
  return <AirflowGuideView lang="ar" />
}
