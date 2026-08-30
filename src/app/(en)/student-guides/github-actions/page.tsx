import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'A complete GitHub Actions guide covering CI/CD fundamentals, workflows, runners, secrets, caching, Docker, reusable workflows, and deployment examples.',
})

export default function EnGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="en" />
}
