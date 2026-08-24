import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RoadmapDetailView from '@/views/RoadmapDetailView'
import { getRoadmaps, getRoadmap } from '@/lib/roadmaps'
import { t } from '@/lib/i18n'
import { tRoadmap } from '@/lib/content-i18n'

type Props = { params: { slug: string } }

/** Required for `output: 'export'` — enumerates every page to pre-render. */
export function generateStaticParams() {
  return getRoadmaps().map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = await getRoadmap(params.slug)
  if (!raw) return {}
  const r = tRoadmap('ar', raw)
  const copy = t('ar')
  return {
    title: r.title,
    description: `${r.tagline} — ${r.audience} ${r.resourceCount} ${copy.common.freeResources}.`,
    alternates: {
      canonical: '/ar/roadmaps/' + params.slug + '/',
      languages: {
        en: `/roadmaps/${params.slug}/`,
        ar: `/ar/roadmaps/${params.slug}/`,
      },
    },
  }
}

export default async function RoadmapPage({ params }: Props) {
  const roadmap = await getRoadmap(params.slug)
  if (!roadmap) notFound()
  return <RoadmapDetailView roadmap={roadmap} lang="ar" />
}
