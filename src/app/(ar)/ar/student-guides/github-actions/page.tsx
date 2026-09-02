import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'دورة كاملة باللغة الإنجليزية عن GitHub Actions تُدرّس على ثلاثة مستويات: اختر مبتدئ أو متوسّط أو متقدّم، ثم اقرأ الشرح الكامل بأمثلة عملية أو مراجعة سريعة للمقابلات أو النصائح والمزالق العملية لهذا المستوى.',
})

export default function ArGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="ar" />
}
