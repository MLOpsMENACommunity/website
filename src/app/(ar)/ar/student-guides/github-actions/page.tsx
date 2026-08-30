import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'دليل شامل باللغة الإنجليزية عن GitHub Actions، يشمل أساسيات CI/CD وسير العمل والأسرار وDocker وأمثلة النشر.',
})

export default function ArGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="ar" />
}
