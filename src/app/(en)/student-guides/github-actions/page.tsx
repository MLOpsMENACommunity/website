import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'A complete GitHub Actions guide in 28 sections: CI/CD fundamentals, workflows, jobs, runners, expressions, secrets, caching, artifacts, matrices, reusable workflows, environments, OIDC and supply-chain security, container builds, ML pipelines, debugging, and full examples.',
})

export default function EnGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="en" />
}
