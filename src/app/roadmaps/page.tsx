import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, BookOpen, Signal } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { getRoadmaps, accentClasses } from '@/lib/roadmaps'

export const metadata: Metadata = {
  title: 'Learning Roadmaps',
  description:
    'Three structured MLOps learning paths built entirely on free and open-source resources — from zero to job-ready, from DevOps to MLOps, and from mid-level to Senior.',
}

export default function RoadmapsPage() {
  const roadmaps = getRoadmaps()
  const totalResources = roadmaps.reduce((n, r) => n + r.resourceCount, 0)

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-white/[0.055] lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Learning roadmaps</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Pick the path that matches{' '}
            <span className="brand-text">where you actually are</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Every roadmap below is built on free and open-source resources, because the real
            knowledge in this field lives on GitHub and YouTube — not behind paywalls.
            <span className="text-white"> {totalResources} curated links</span> in total.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="space-y-6">
          {roadmaps.map((r, i) => {
            const a = accentClasses[r.accent]
            return (
              <Reveal key={r.slug} delay={i * 90}>
                <Link
                  href={`/roadmaps/${r.slug}`}
                  className={`card card-hover group relative block overflow-hidden p-7 sm:p-9 ${a.border}`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 ${a.dot} opacity-70`} />

                  <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`chip ${a.text} ${a.border}`}>{r.level}</span>
                        <span className="chip"><Clock className="h-3 w-3" />{r.duration}</span>
                        <span className="chip"><Signal className="h-3 w-3" />{r.commitment}</span>
                      </div>

                      <h2 className="mt-5 text-2xl font-bold leading-snug text-white sm:text-3xl">
                        {r.title}
                      </h2>
                      <p className={`mt-2 text-base font-medium ${a.text}`}>{r.tagline}</p>
                      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
                        {r.audience}
                      </p>

                      <div className="mt-7 flex items-center gap-4">
                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${a.text}`}>
                          Open the roadmap
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <BookOpen className="h-3.5 w-3.5" />
                          {r.resourceCount} free resources
                        </span>
                      </div>
                    </div>

                    {/* Phase list preview */}
                    <ol className="space-y-2.5 self-center">
                      {r.phases.slice(0, 5).map((p) => (
                        <li key={p.label} className="flex items-start gap-3">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-300">{p.title}</span>
                            {p.when && <span className="ml-2 text-xs text-slate-600">{p.when}</span>}
                          </div>
                        </li>
                      ))}
                      {r.phases.length > 5 && (
                        <li className="pl-[18px] text-xs text-slate-600">
                          + {r.phases.length - 5} more
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
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
