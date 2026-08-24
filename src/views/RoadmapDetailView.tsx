import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Clock, Signal, BookOpen, Users, Languages } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { getRoadmaps, accentClasses, type Roadmap } from '@/lib/roadmaps'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { tRoadmap, tPhaseLabel } from '@/lib/content-i18n'

/**
 * Mirrors github-slugger (used by rehype-slug) so TOC anchors match heading ids.
 * Note it maps EACH space to one hyphen without collapsing runs — removing the
 * em-dash in "Phase 0 — Foundations" leaves two spaces, hence "phase-0--foundations".
 *
 * Always built from the ENGLISH heading, because the markdown body is English in
 * both editions.
 */
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 \-_]/g, '')
    .replace(/ /g, '-')
}

export default function RoadmapDetailView({
  roadmap,
  lang,
}: {
  roadmap: Roadmap
  lang: Lang
}) {
  const copy = t(lang)
  const c = copy.roadmapsPage
  const localized = tRoadmap(lang, roadmap)
  const a = accentClasses[roadmap.accent]
  const others = getRoadmaps()
    .filter((r) => r.slug !== roadmap.slug)
    .map((r) => tRoadmap(lang, r))

  /** Anchor for phase i, derived from the untranslated heading. */
  const anchor = (i: number) => {
    const p = roadmap.phases[i]
    return slugify(`${p.label} — ${p.title}${p.when ? ` (${p.when})` : ''}`)
  }

  return (
    <>
      {/* ---------- Cover ---------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className={`pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full ${a.bg} blur-[100px]`} />
        <HexField className="pointer-events-none absolute end-6 top-14 hidden h-56 w-80 text-hex lg:block" />

        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8">
          <div>
            <Link href={localeHref(lang, '/roadmaps')}
                  className="inline-flex items-center gap-2 text-sm text-faint transition hover:text-fg">
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {copy.common.allRoadmaps}
            </Link>
          </div>

          <span className="eyebrow mt-8">{copy.home.hero.eyebrow}</span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {localized.title}
          </h1>
          <p className={`mt-4 text-lg font-medium ${a.text}`}>{localized.tagline}</p>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className={`chip ${a.text} ${a.border}`}>{localized.level}</span>
            <span className="chip"><Clock className="h-3 w-3" />{localized.duration}</span>
            <span className="chip"><Signal className="h-3 w-3" />{localized.commitment}</span>
            <span className="chip">
              <BookOpen className="h-3 w-3" />{roadmap.resourceCount} {copy.common.freeResources}
            </span>
          </div>

          <p className="mt-6 flex max-w-2xl items-start gap-2.5 text-sm leading-relaxed text-muted">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-ghost" />
            {localized.audience}
          </p>

          {/* Phase timeline strip, as on the published covers */}
          {roadmap.phases.length > 0 && (
            <div className="mt-10 overflow-x-auto pb-2">
              <ol className="flex min-w-max items-start gap-0">
                {localized.phases.map((p, i) => (
                  <li key={p.label} className="flex items-start">
                    <a
                      href={`#${anchor(i)}`}
                      className="group block w-36 shrink-0 text-center enter"
                      style={{ '--enter-delay': `${i * 120}ms` } as React.CSSProperties}
                    >
                      <span className={`mx-auto block h-3 w-3 rounded-full ${a.dot} ring-4 ${
                        roadmap.accent === 'cyan' ? 'ring-cyan-400/15'
                        : roadmap.accent === 'amber' ? 'ring-amber-400/15' : 'ring-violet/15'
                      } transition duration-300 group-hover:scale-150`} />
                      <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted transition group-hover:text-fg">
                        {tPhaseLabel(lang, p.label)}
                      </span>
                      <span className="mt-1 block px-2 text-[11px] leading-tight text-ghost">
                        {p.when || p.title}
                      </span>
                    </a>
                    {i < roadmap.phases.length - 1 && (
                      <span
                        className="draw-line mt-1.5 h-px w-6 bg-line-strong sm:w-10"
                        style={{ '--enter-delay': `${i * 120 + 90}ms` } as React.CSSProperties}
                      />
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
          <div className="min-w-0">
            {lang === 'ar' && (
              <p className="mb-8 flex items-start gap-2.5 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4 text-sm leading-relaxed text-body">
                <Languages className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                {c.englishNotice}
              </p>
            )}
            <Reveal>
              {/* The roadmap body is English in both editions, so it is always
                  laid out left-to-right even on the Arabic pages. */}
              <article
                dir="ltr"
                className="prose-brand prose-h2:mt-14 prose-h2:scroll-mt-28 prose-h2:border-t
                           prose-h2:border-line prose-h2:pt-10 prose-h2:text-2xl
                           prose-h3:text-lg prose-h3:text-cyan-400
                           prose-blockquote:rounded-r-xl prose-blockquote:border-l-2
                           prose-blockquote:bg-surface-2 prose-blockquote:py-3 prose-blockquote:pr-4
                           prose-blockquote:not-italic"
                dangerouslySetInnerHTML={{ __html: roadmap.html }}
              />
            </Reveal>
          </div>

          {/* Sticky phase navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                {c.onThisPage}
              </p>
              <nav className="mt-4 space-y-1.5 border-s border-line ps-4">
                {localized.phases.map((p, i) => (
                  <a
                    key={p.label}
                    href={`#${anchor(i)}`}
                    className="block text-sm leading-snug text-faint transition hover:text-cyan-400"
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-ghost">
                      {tPhaseLabel(lang, p.label)}
                    </span>
                    {p.title}
                  </a>
                ))}
              </nav>

              {roadmap.sourceUrl && (
                <a href={roadmap.sourceUrl} target="_blank" rel="noreferrer"
                   className="mt-8 flex items-center gap-2 text-xs text-faint transition hover:text-cyan-400">
                  {c.readOriginal}
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
        <h2 className="text-xl font-bold">{c.otherPaths}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {others.map((r) => {
            const oa = accentClasses[r.accent]
            return (
              <Link key={r.slug} href={localeHref(lang, `/roadmaps/${r.slug}`)}
                    className={`card card-hover group p-6 ${oa.border}`}>
                <span className={`chip ${oa.text} ${oa.border}`}>{r.level}</span>
                <h3 className="mt-4 text-lg font-semibold text-fg">{r.title}</h3>
                <p className={`mt-1 text-sm ${oa.text}`}>{r.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-faint transition group-hover:text-fg">
                  {r.phases.length} {copy.common.phases} · {r.duration}
                </span>
              </Link>
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
