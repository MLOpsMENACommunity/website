import type { Metadata } from 'next'
import AirflowGuideView from '@/views/AirflowGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/airflow',
  title: 'The Complete Airflow Guide',
  description: 'A complete Apache Airflow course taught at three levels. Choose Beginner, Mid-level, or Senior, then read the full explanation with worked examples, a fast interview review, or the practical tips and traps for that level.',
})

export default function EnAirflowGuidePage() {
  return <AirflowGuideView lang="en" />
}
