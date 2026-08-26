import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RoadmapDetailView from '@/views/RoadmapDetailView'
import { getRoadmaps, getRoadmap } from '@/lib/roadmaps'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { tRoadmap } from '@/lib/content-i18n'

type Props = { params: { slug: string } }

/** Required for `output: 'export'` — enumerates every page to pre-render. */
export function generateStaticParams() {
  return getRoadmaps().map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = await getRoadmap(params.slug)
  if (!raw) return {}
  const r = tRoadmap('en', raw)
  const copy = t('en')
  return pageMetadata({
    lang: 'en',
    path: `/roadmaps/${params.slug}`,
    title: r.title,
    description: `${r.tagline} — ${r.audience} ${r.resourceCount} ${copy.common.freeResources}.`,
  })
}

export default async function RoadmapPage({ params }: Props) {
  const roadmap = await getRoadmap(params.slug)
  if (!roadmap) notFound()
  return <RoadmapDetailView roadmap={roadmap} lang="en" />
}
