import Link from 'next/link'
import { ArrowLeft, Box } from 'lucide-react'
import GuideArticle from '@/components/GuideArticle'
import GuideNavigation from '@/components/GuideNavigation'
import { getDockerGuideContent } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

export default async function DockerGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const { html, headings } = await getDockerGuideContent()

  return (
    <>
      <section className="guide-page-hero docker-guide-hero relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-400/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="docker-bubbles" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip border-cyan-400/30 text-cyan-400"><Box className="h-3.5 w-3.5" /> Docker</span>
            <span className="chip">Core to Advanced</span>
            <span className="chip">Containers</span>
            <span className="chip">Production</span>
            <span className="chip">26 sections</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              The Complete <span className="docker-text">Docker</span> Guide
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Learn containers by doing: build images, run services, persist data, connect networks, secure workloads, debug failures, package machine-learning models, and ship production-ready applications.
            </p>
            {/* Decorative stand-in for an image build replaying its layers. */}
            <div className="docker-layers" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <div className="guide-page-layout docker-guide-page mx-auto max-w-content px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:py-14">
        <GuideNavigation headings={headings} labels={c} title="Docker" />
        <GuideArticle html={html} copiedLabel={c.copied} />
      </div>
    </>
  )
}
