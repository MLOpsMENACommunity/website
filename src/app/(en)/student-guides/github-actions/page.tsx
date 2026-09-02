import type { Metadata } from 'next'
import GitHubActionsGuideView from '@/views/GitHubActionsGuideView'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides/github-actions',
  title: 'The Complete GitHub Actions Guide',
  description: 'A complete GitHub Actions course taught at three levels. Choose Beginner, Mid-level, or Senior, then read the full explanation with worked examples, a fast interview review, or the practical tips and traps for that level.',
})

export default function EnGitHubActionsGuidePage() {
  return <GitHubActionsGuideView lang="en" />
}
