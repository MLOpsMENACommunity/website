import { BookOpen } from 'lucide-react'
import HexField from '@/components/HexField'
import Reveal from '@/components/Reveal'
import StudentGuidesCatalog from '@/components/StudentGuidesCatalog'
import { studentGuides } from '~/data/student-guides'
import { t, type Lang } from '@/lib/i18n'

export default function StudentGuidesView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.lead}</p>
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
          <Reveal>
            <StudentGuidesCatalog guides={studentGuides} lang={lang} labels={c} />
          </Reveal>
        )}
      </section>
    </>
  )
}
