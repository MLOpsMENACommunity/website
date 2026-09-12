import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GuideLevelTracks from '@/components/GuideLevelTracks'
import ToolLogo from '@/components/ToolLogo'
import { getGuideLevels, getQuickStart } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

const monitoringStages = ['Reference', 'Current', 'Test', 'Monitor']

export default async function EvidentlyGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const levels = await getGuideLevels('evidently')
  const quickStart = getQuickStart('evidently')
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
      <section className="guide-page-hero evidently-guide-hero relative overflow-hidden border-b border-line">
        <div className="evidently-hero-glow" aria-hidden="true" />
        <div className="evidently-hero-monitor" aria-hidden="true">
          <div className="evidently-monitor-head"><span>LIVE MONITOR</span><b>DRIFT</b></div>
          <div className="evidently-monitor-plot">
            <i className="evidently-monitor-limit" />
            <span className="evidently-monitor-reference"><b /><b /><b /><b /><b /><b /><b /><b /><b /></span>
            <span className="evidently-monitor-current"><b /><b /><b /><b /><b /><b /><b /><b /><b /></span>
            <em>0.21</em>
          </div>
          <div className="evidently-monitor-legend"><span>REFERENCE</span><span>CURRENT</span><strong>THRESHOLD 0.10</strong></div>
        </div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-blue-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip guide-hero-tool"><ToolLogo slug="evidently" /> Evidently</span>
            <span className="chip">ML monitoring</span>
            <span className="chip">{levels.length} levels</span>
            <span className="chip">{sections} sections</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <div className="guide-hero-head">
              <span className="guide-hero-logo" aria-hidden="true"><ToolLogo slug="evidently" /></span>
              <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl"><span className="evidently-text">Evidently</span> Learning Path</h1>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Start by comparing reference and current data. Then turn drift, quality, and model checks into reliable pipelines, and progress to secure organization-wide monitoring policy and operations.
            </p>
            <div className="evidently-stage-grid" aria-label="Evidently monitoring workflow">
              {monitoringStages.map((stage, index) => <div key={stage} className="evidently-stage-card"><span>0{index + 1}</span><strong>{stage}</strong></div>)}
            </div>
          </div>
        </div>
      </section>
      <GuideLevelTracks levels={levels} labels={guideLabels} slug="evidently" quickStart={quickStart} />
    </>
  )
}
