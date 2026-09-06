import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, Files, FolderOpen } from 'lucide-react'
import HexField from '@/components/HexField'
import Reveal from '@/components/Reveal'
import StudentGuidesCatalog from '@/components/StudentGuidesCatalog'
import { getOtherQuickStarts, getStudentGuideSectionCounts } from '@/lib/student-guides.server'
import { studentGuides } from '~/data/student-guides'
import { localeHref, t, type Lang } from '@/lib/i18n'

/** Staggered entrance: each block starts `step` later than the one above it. */
const step = (n: number) => ({ '--enter-delay': `${n * 110}ms` }) as React.CSSProperties

export default function StudentGuidesView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  /* Section counts are read from the guide markdown at build time so the per-card
     figure cannot drift from the guide itself. */
  const sectionsBySlug = getStudentGuideSectionCounts()
  /* Drive PDFs not named after a tool guide back a single extra card + page. */
  const otherFiles = getOtherQuickStarts()

  return (
    <>
      <section className="guides-hero relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px] animate-float-slow" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px] animate-float-slow [animation-delay:6s]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow enter" style={step(0)}>{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {/* Two blocks, but the space keeps the accessible name and SEO text
                reading as one sentence rather than "...forthe MLOps toolchain". */}
            <span className="block enter" style={step(1)}>{c.titleBefore}</span>{' '}
            <span className="mt-2 block brand-text brand-text-animated text-shadow-glow enter" style={step(2)}>
              {c.accent}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted enter" style={step(3)}>{c.lead}</p>
        </div>
      </section>

      <section className="student-guides-listing relative mx-auto max-w-content px-5 py-16 sm:px-8">
        {studentGuides.length === 0 ? (
          <Reveal>
            <div className="card flex min-h-72 flex-col items-center justify-center border-dashed px-6 py-14 text-center sm:px-12">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-400">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-fg">{c.emptyTitle}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{c.emptyLead}</p>
            </div>
          </Reveal>
        ) : (
          <StudentGuidesCatalog
            guides={studentGuides}
            lang={lang}
            labels={c}
            sectionsBySlug={sectionsBySlug}
          />
        )}

        {/* A single extra card for everything in the Drive folder that is not a
            tool guide. Always shown so it is a permanent entry point; the target
            page carries its own empty state when the sync found no such files. */}
        <Reveal>
            <Link
              href={localeHref(lang, '/student-guides/other')}
              className="other-guide-card student-guide-card card card-hover group mt-5 flex min-h-80 flex-col overflow-hidden p-6 sm:p-8"
            >
              {/* Amber-themed animation, sibling to the docker card's: a stack of
                  PDF sheets, floating file nodes, and a scanning sweep. */}
              <div className="other-card-background" aria-hidden="true">
                <div className="other-doc-stack"><i /><i /><i /><i /><i /></div>
                <span className="other-card-node node-one"><FolderOpen /></span>
                <span className="other-card-node node-two"><FileText /></span>
                <span className="other-card-node node-three"><Files /></span>
                <i className="other-card-wave wave-one" />
                <i className="other-card-wave wave-two" />
              </div>
              <div className="relative flex h-full flex-col md:max-w-[68%]">
                <div className="flex items-start justify-between gap-4">
                  <span className="guide-card-logo other-card-icon">
                    <Files className="h-6 w-6" />
                  </span>
                  {otherFiles.length > 0 && <span className="chip">{otherFiles.length} PDF</span>}
                </div>
                <h2 className="mt-6 text-2xl font-semibold leading-snug text-fg sm:text-3xl">{c.otherQuickStart}</h2>
                <p className="mt-3 max-w-2xl flex-1 text-sm leading-relaxed text-muted sm:text-base">
                  {c.otherQuickStartCardDesc}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-cyan-400">
                  {c.openGuide}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          </Reveal>
      </section>
    </>
  )
}
