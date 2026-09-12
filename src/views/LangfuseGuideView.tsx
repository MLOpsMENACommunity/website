import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GuideLevelTracks from '@/components/GuideLevelTracks'
import ToolLogo from '@/components/ToolLogo'
import { getGuideLevels, getQuickStart } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

/* The hero rail mirrors the guide spine: capture work, inspect the tree,
   measure quality, then make a release decision. */
const flow = ['Learn', 'Build', 'Operate', 'Lead']

export default async function LangfuseGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const levels = await getGuideLevels('langfuse')
  const quickStart = getQuickStart('langfuse')
  const guideLabels = lang === 'en'
    ? {
        ...c,
        levels: { beginner: 'Beginner', mid: 'Intermediate', senior: 'Advanced' },
        tracks: { detailed: 'Learn in depth', interview: 'Interview prep', tips: 'Practice lab' },
      }
    : c
  const sections = levels.reduce((total, level) => total + level.sections, 0)

  return (
    <>
      <section className="guide-page-hero langfuse-guide-hero relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="langfuse-scores" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip guide-hero-tool"><ToolLogo slug="langfuse" /> Langfuse</span>
            <span className="chip">LLM observability</span>
            <span className="chip">{levels.length} levels</span>
            <span className="chip">{sections} sections</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <div className="guide-hero-head">
              <span className="guide-hero-logo" aria-hidden="true"><ToolLogo slug="langfuse" /></span>
              <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
                <span className="langfuse-text">Langfuse</span> Learning Path
              </h1>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Start at your current experience level. Beginners build and debug a first trace, intermediate learners make tracing reliable in production, and advanced learners design governance, evaluation, privacy, and platform operations.
            </p>
            <div className="langfuse-rail" aria-hidden="true">
              {flow.map((stage, index) => (
                <span key={stage} className="langfuse-rail-node" style={{ '--rail-index': index } as React.CSSProperties}>
                  {stage}
                </span>
              ))}
              <i className="langfuse-rail-line" />
            </div>
          </div>
        </div>
      </section>

      <GuideLevelTracks levels={levels} labels={guideLabels} slug="langfuse" quickStart={quickStart} />
    </>
  )
}
