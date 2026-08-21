import type { MetadataRoute } from 'next'
import { getRoadmaps } from '@/lib/roadmaps'
import { site } from '~/site.config'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '', '/roadmaps', '/courses', '/courses/mlops-practitioner',
    '/sessions', '/team', '/articles', '/mentorship', '/faq',
  ]
  return [
    ...staticPages.map((p) => ({
      url: `${site.url}${p}/`.replace(/\/\/$/, '/'),
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.8,
    })),
    ...getRoadmaps().map((r) => ({
      url: `${site.url}/roadmaps/${r.slug}/`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
