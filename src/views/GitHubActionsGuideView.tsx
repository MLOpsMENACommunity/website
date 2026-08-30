import Link from 'next/link'
import { ArrowLeft, Github } from 'lucide-react'
import GuideArticle from '@/components/GuideArticle'
import GuideNavigation from '@/components/GuideNavigation'
import { getGitHubActionsGuideContent } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

export default function GitHubActionsGuideView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const { html, headings } = getGitHubActionsGuideContent()

  return (
    <>
      <section className="guide-page-hero relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <div className="guide-orbit guide-orbit-one" aria-hidden="true" />
        <div className="guide-orbit guide-orbit-two" aria-hidden="true" />
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link href={localeHref(lang, '/student-guides')} className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-chips mt-8 flex flex-wrap items-center gap-2">
            <span className="chip border-cyan-400/30 text-cyan-400"><Github className="h-3.5 w-3.5" /> GitHub Actions</span>
            <span className="chip">CI/CD</span>
            <span className="chip">DevOps</span>
            {lang === 'ar' && <span className="chip">{c.englishGuide}</span>}
          </div>
          <div lang="en" dir="ltr" className="guide-hero-copy">
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              The Complete <span className="brand-text">GitHub Actions</span> Guide
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
              Learn GitHub Actions from your first workflow through production-ready CI/CD, reusable automation, Docker builds, and deployment controls.
            </p>
          </div>
        </div>
      </section>

      <div className="guide-page-layout mx-auto max-w-content px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:py-14">
        <GuideNavigation headings={headings} labels={c} />
        <GuideArticle html={html} copiedLabel={c.copied} />
      </div>
    </>
  )
}
