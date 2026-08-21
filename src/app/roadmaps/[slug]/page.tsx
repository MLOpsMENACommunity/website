import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Clock, Signal, BookOpen, Users } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { getRoadmaps, getRoadmap, accentClasses } from '@/lib/roadmaps'

type Props = { params: { slug: string } }

/** Required for `output: 'export'` — enumerates every page to pre-render. */
export function generateStaticParams() {
  return getRoadmaps().map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRoadmap(params.slug)
  if (!r) return {}
  return {
    title: r.title,
    description: `${r.tagline} — ${r.audience} ${r.resourceCount} free resources across ${r.phases.length} phases.`,
  }
}

export default async function RoadmapPage({ params }: Props) {
  const roadmap = await getRoadmap(params.slug)
  if (!roadmap) notFound()

  const a = accentClasses[roadmap.accent]
  const others = getRoadmaps().filter((r) => r.slug !== roadmap.slug)

  return (
    <>
      {/* ---------- Cover ---------- */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className={`pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full ${a.bg} blur-[100px]`} />
        <HexField className="pointer-events-none absolute right-6 top-14 hidden h-56 w-80 text-white/[0.055] lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8">
          <div>
            <Link href="/roadmaps"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" /> All roadmaps
            </Link>
          </div>

          <span className="eyebrow mt-8">MLOps MENA Community</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {roadmap.title}
          </h1>
          <p className={`mt-4 text-lg font-medium ${a.text}`}>{roadmap.tagline}</p>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className={`chip ${a.text} ${a.border}`}>{roadmap.level}</span>
            <span className="chip"><Clock className="h-3 w-3" />{roadmap.duration}</span>
            <span className="chip"><Signal className="h-3 w-3" />{roadmap.commitment}</span>
            <span className="chip"><BookOpen className="h-3 w-3" />{roadmap.resourceCount} free resources</span>
          </div>

          <p className="mt-6 flex max-w-2xl items-start gap-2.5 text-sm leading-relaxed text-slate-400">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            {roadmap.audience}
          </p>

          {/* Phase timeline strip, as on the published covers */}
          {roadmap.phases.length > 0 && (
            <div className="mt-10 overflow-x-auto pb-2">
              <ol className="flex min-w-max items-start gap-0">
                {roadmap.phases.map((p, i) => (
                  <li key={p.label} className="flex items-start">
                    <a href={`#${slugify(`${p.label} — ${p.title}${p.when ? ` (${p.when})` : ''}`)}`}
                       className="group block w-36 shrink-0 text-center">
                      <span className={`mx-auto block h-3 w-3 rounded-full ${a.dot} ring-4 ${
                        roadmap.accent === 'cyan' ? 'ring-cyan-400/15'
                        : roadmap.accent === 'amber' ? 'ring-amber-400/15' : 'ring-violet/15'
                      } transition group-hover:scale-125`} />
                      <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 transition group-hover:text-white">
                        {p.label}
                      </span>
                      <span className="mt-1 block px-2 text-[11px] leading-tight text-slate-600">
                        {p.when || p.title}
                      </span>
                    </a>
                    {i < roadmap.phases.length - 1 && (
                      <span className="mt-1.5 h-px w-6 bg-white/15 sm:w-10" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Body ---------- */}
      <section className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Reveal>
            <article
              className="prose-brand prose-h2:mt-14 prose-h2:scroll-mt-28 prose-h2:border-t
                         prose-h2:border-white/10 prose-h2:pt-10 prose-h2:text-2xl
                         prose-h3:text-lg prose-h3:text-cyan-400
                         prose-blockquote:rounded-r-xl prose-blockquote:border-l-2
                         prose-blockquote:bg-white/[0.03] prose-blockquote:py-3 prose-blockquote:pr-4
                         prose-blockquote:not-italic"
              dangerouslySetInnerHTML={{ __html: roadmap.html }}
            />
          </Reveal>

          {/* Sticky phase navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                On this page
              </p>
              <nav className="mt-4 space-y-1.5 border-l border-white/10 pl-4">
                {roadmap.phases.map((p) => (
                  <a
                    key={p.label}
                    href={`#${slugify(`${p.label} — ${p.title}${p.when ? ` (${p.when})` : ''}`)}`}
                    className="block text-sm leading-snug text-slate-500 transition hover:text-cyan-400"
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-600">
                      {p.label}
                    </span>
                    {p.title}
                  </a>
                ))}
              </nav>

              {roadmap.sourceUrl && (
                <a href={roadmap.sourceUrl} target="_blank" rel="noreferrer"
                   className="mt-8 flex items-center gap-2 text-xs text-slate-500 transition hover:text-cyan-400">
                  Read the original on LinkedIn
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ---------- Other roadmaps ---------- */}
      <section className="mx-auto max-w-content px-5 pb-16 sm:px-8">
        <div className="rule mb-12" />
        <h2 className="text-xl font-bold">Other paths</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {others.map((r) => {
            const oa = accentClasses[r.accent]
            return (
              <Link key={r.slug} href={`/roadmaps/${r.slug}`}
                    className={`card card-hover group p-6 ${oa.border}`}>
                <span className={`chip ${oa.text} ${oa.border}`}>{r.level}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{r.title}</h3>
                <p className={`mt-1 text-sm ${oa.text}`}>{r.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition group-hover:text-white">
                  {r.phases.length} phases · {r.duration}
                </span>
              </Link>
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

/**
 * Mirrors github-slugger (used by rehype-slug) so TOC anchors match heading ids.
 * Note it maps EACH space to one hyphen without collapsing runs — removing the
 * em-dash in "Phase 0 — Foundations" leaves two spaces, hence "phase-0--foundations".
 */
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 \-_]/g, '')
    .replace(/ /g, '-')
}
