import Link from 'next/link'
import { ArrowRight, Clock, BookOpen, Signal } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { getRoadmaps, accentClasses } from '@/lib/roadmaps'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { tRoadmap } from '@/lib/content-i18n'

export default function RoadmapsView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.roadmapsPage
  const roadmaps = getRoadmaps().map((r) => tRoadmap(lang, r))
  const totalResources = roadmaps.reduce((n, r) => n + r.resourceCount, 0)

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
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {c.leadBefore}{' '}
            <span className="text-fg">{totalResources} {c.leadLinks}</span> {c.leadAfter}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="space-y-6">
          {roadmaps.map((r, i) => {
            const a = accentClasses[r.accent]
            return (
              <Reveal key={r.slug} delay={i * 90} variant={i % 2 === 0 ? 'start' : 'end'}>
                <Link
                  href={localeHref(lang, `/roadmaps/${r.slug}`)}
                  className={`card card-hover group relative block overflow-hidden p-7 sm:p-9 ${a.border}`}
                >
                  <div className={`absolute inset-y-0 start-0 w-1 ${a.dot} opacity-70 transition-opacity duration-300 group-hover:opacity-100`} />

                  <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`chip ${a.text} ${a.border}`}>{r.level}</span>
                        <span className="chip"><Clock className="h-3 w-3" />{r.duration}</span>
                        <span className="chip"><Signal className="h-3 w-3" />{r.commitment}</span>
                      </div>

                      <h2 className="mt-5 text-2xl font-bold leading-snug text-fg sm:text-3xl">
                        {r.title}
                      </h2>
                      <p className={`mt-2 text-base font-medium ${a.text}`}>{r.tagline}</p>
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{r.audience}</p>

                      <div className="mt-7 flex items-center gap-4">
                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${a.text}`}>
                          {c.openRoadmap}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-faint">
                          <BookOpen className="h-3.5 w-3.5" />
                          {r.resourceCount} {copy.common.freeResources}
                        </span>
                      </div>
                    </div>

                    {/* Phase list preview */}
                    <ol className="space-y-2.5 self-center">
                      {r.phases.slice(0, 5).map((p) => (
                        <li key={p.label} className="flex items-start gap-3">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-body">{p.title}</span>
                            {p.when && <span className="ms-2 text-xs text-ghost">{p.when}</span>}
                          </div>
                        </li>
                      ))}
                      {r.phases.length > 5 && (
                        <li className="ps-[18px] text-xs text-ghost">
                          + {r.phases.length - 5} {copy.common.more}
                        </li>
                      )}
                    </ol>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
