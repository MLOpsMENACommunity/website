import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GuideLevelTracks from '@/components/GuideLevelTracks'
import ToolLogo from '@/components/ToolLogo'
import { getGuideLevels, getQuickStart } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

const evaluationStages = ['Dataset', 'Metrics', 'Compare', 'Gate']

export default async function RagasGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const levels = await getGuideLevels('ragas')
  const quickStart = getQuickStart('ragas')
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
      <section className="guide-page-hero ragas-guide-hero relative overflow-hidden border-b border-line">
        <div className="ragas-hero-glow glow-one" aria-hidden="true" />
        <div className="ragas-hero-glow glow-two" aria-hidden="true" />
        <div className="ragas-hero-radar" aria-hidden="true">
          <i className="ragas-hero-ring ring-outer" />
          <i className="ragas-hero-ring ring-middle" />
          <i className="ragas-hero-ring ring-inner" />
          <i className="ragas-hero-axis axis-x" />
          <i className="ragas-hero-axis axis-y" />
          <i className="ragas-hero-shape" />
          <i className="ragas-hero-sweep" />
          <span>0.87<small>PASS</small></span>
        </div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip guide-hero-tool"><ToolLogo slug="ragas" /> RAGAS</span>
            <span className="chip">RAG evaluation</span>
            <span className="chip">{levels.length} levels</span>
            <span className="chip">{sections} sections</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <div className="guide-hero-head">
              <span className="guide-hero-logo" aria-hidden="true"><ToolLogo slug="ragas" /></span>
              <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
                <span className="ragas-text">RAGAS</span> Learning Path
              </h1>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Begin with a dependable RAG evaluation dataset and four core metrics. Then build calibrated regression gates, and progress to secure multi-team governance, judge qualification, and platform operations.
            </p>
            <div className="ragas-stage-grid" aria-label="RAGAS evaluation workflow">
              {evaluationStages.map((stage, index) => (
                <div key={stage} className="ragas-stage-card">
                  <span>0{index + 1}</span>
                  <strong>{stage}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <GuideLevelTracks levels={levels} labels={guideLabels} slug="ragas" quickStart={quickStart} />
    </>
  )
}
