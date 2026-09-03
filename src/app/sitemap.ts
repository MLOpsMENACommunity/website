import type { MetadataRoute } from 'next'
import { getRoadmaps } from '@/lib/roadmaps'
import { site } from '~/site.config'

export const dynamic = 'force-static'

const staticPages = [
  '', '/roadmaps', '/student-guides', '/courses', '/courses/mlops-practitioner',
  '/student-guides/docker', '/student-guides/github-actions', '/student-guides/dvc', '/student-guides/airflow', '/student-guides/clearml', '/sessions', '/team', '/articles', '/mentorship', '/faq', '/privacy-policy',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPages.map((p) => ({ path: p, priority: p === '' ? 1 : 0.8, freq: 'weekly' as const })),
    ...getRoadmaps().map((r) => ({
      path: `/roadmaps/${r.slug}`,
      priority: 0.7,
      freq: 'monthly' as const,
    })),
  ]

  const url = (path: string) => `${site.url}${path}/`.replace(/\/\/$/, '/')

  // Every page is listed once per edition, each pointing at both via hreflang.
  return paths.flatMap(({ path, priority, freq }) => {
    const languages = { en: url(path), ar: url(`/ar${path}`) }
    return [
      { url: languages.en, changeFrequency: freq, priority, alternates: { languages } },
      { url: languages.ar, changeFrequency: freq, priority, alternates: { languages } },
    ]
  })
}
