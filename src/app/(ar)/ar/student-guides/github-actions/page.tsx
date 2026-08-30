import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'دليل شامل باللغة الإنجليزية عن GitHub Actions في 28 قسمًا: أساسيات CI/CD وسير العمل والوظائف والخطوات والتعبيرات والأسرار والتخزين المؤقت والمصنوعات وإعادة الاستخدام والأمان وبناء الحاويات وخطوط تعلّم الآلة وأمثلة نشر كاملة.',
})

export default function ArGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="ar" />
}
