import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GuideLevelTracks from '@/components/GuideLevelTracks'
import ToolLogo from '@/components/ToolLogo'
import { getGuideLevels } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

/* The hero rail mirrors the architecture the Beginner track opens with:
   a DAG file → the scheduler → the executor → a worker. */
const stages = ['DAG', 'Scheduler', 'Executor', 'Worker']

export default async function AirflowGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const levels = await getGuideLevels('airflow')
  const sections = levels.reduce((total, level) => total + level.sections, 0)

  return (
    <>
      <section className="guide-page-hero airflow-guide-hero relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        {/* Decorative stand-in for a scheduler ticking through intervals. */}
        <div className="airflow-ticks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip guide-hero-tool"><ToolLogo slug="airflow" /> Airflow</span>
            <span className="chip">Orchestration</span>
            <span className="chip">{levels.length} levels</span>
            <span className="chip">{sections} sections</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <div className="guide-hero-head">
              <span className="guide-hero-logo" aria-hidden="true"><ToolLogo slug="airflow" /></span>
              <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
                The Complete <span className="airflow-text">Airflow</span> Guide
              </h1>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Taught at three levels, written three ways. Pick Beginner, Mid-level, or Senior, then read the full explanation, a fast interview review, or the practical tips and traps for that level.
            </p>
            <div className="airflow-rail" aria-hidden="true">
              {stages.map((stage, index) => (
                <span key={stage} className="airflow-rail-node" style={{ '--rail-index': index } as React.CSSProperties}>
                  {stage}
                </span>
              ))}
              <i className="airflow-rail-line" />
            </div>
          </div>
        </div>
      </section>

      <GuideLevelTracks levels={levels} labels={c} slug="airflow" />
    </>
  )
}
