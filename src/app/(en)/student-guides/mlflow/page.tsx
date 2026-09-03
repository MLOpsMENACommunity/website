import type { Metadata } from 'next'
import MlflowGuideView from '@/views/MlflowGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/mlflow',
  title: 'The Complete MLflow Guide',
  description: 'A complete MLflow course taught at three levels. Choose Beginner, Mid-level, or Senior, then read the full explanation with worked examples, a fast interview review, or the practical tips and traps for that level.',
})

export default function EnMlflowGuidePage() {
  return <MlflowGuideView lang="en" />
}
