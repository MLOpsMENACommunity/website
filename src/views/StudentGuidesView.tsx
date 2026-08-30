import { BookOpen } from 'lucide-react'
import HexField from '@/components/HexField'
import Reveal from '@/components/Reveal'
import StudentGuidesCatalog from '@/components/StudentGuidesCatalog'
import { getStudentGuideSectionCounts } from '@/lib/student-guides.server'
import { studentGuides } from '~/data/student-guides'
import { t, type Lang } from '@/lib/i18n'

/** Staggered entrance: each block starts `step` later than the one above it. */
const step = (n: number) => ({ '--enter-delay': `${n * 110}ms` }) as React.CSSProperties

export default function StudentGuidesView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  /* Section counts are read from the guide markdown at build time so the per-card
     figure cannot drift from the guide itself. */
  const sectionsBySlug = getStudentGuideSectionCounts()

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
      </section>
    </>
  )
}
