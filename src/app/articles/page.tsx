import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Linkedin, BookOpen, CalendarDays } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { externalArticles } from '~/data/articles'
import { channels } from '~/site.config'

export const metadata: Metadata = {
  title: 'Articles',
  description:
    'Articles published by the MLOps MENA Community on LinkedIn and Medium — roadmaps, production ML practice, and career guidance.',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ArticlesPage() {
  const articles = [...externalArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
  const [lead, ...rest] = articles

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-white/[0.055] lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Articles</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Published on <span className="brand-text">LinkedIn and Medium</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Everything the community writes, in one place. Follow us on LinkedIn to catch new
            posts as they go up.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={channels.linkedin} target="_blank" rel="noreferrer" className="btn-primary">
              <Linkedin className="h-4 w-4" /> Follow on LinkedIn
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        {articles.length === 0 ? (
          <div className="card border-dashed p-12 text-center">
            <p className="text-sm text-slate-500">No articles published yet.</p>
          </div>
        ) : (
          <>
            <Reveal>
              <article className="card card-hover group relative overflow-hidden p-7 sm:p-10">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/10 blur-3xl" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border-cyan-400/30 text-cyan-400">
                      <Linkedin className="h-3 w-3" /> {lead.platform}
                    </span>
                    {lead.tags.map((t) => (
                      <span key={t} className="chip !px-2 !py-0.5 text-[10px]">{t}</span>
                    ))}
                  </div>

                  <h2 className="mt-5 max-w-3xl text-2xl font-bold leading-snug text-white sm:text-3xl">
                    {lead.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
                    {lead.description}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a href={lead.href} target="_blank" rel="noreferrer" className="btn-primary !px-5 !py-2.5">
                      Read on {lead.platform} <ArrowUpRight className="h-4 w-4" />
                    </a>
                    {lead.internalHref && (
                      <Link href={lead.internalHref} className="btn-ghost !px-5 !py-2.5">
                        Read it here <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />{fmt(lead.date)}
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {rest.map((a, i) => (
                <Reveal key={a.href} delay={i * 80}>
                  <article className="card card-hover flex h-full flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip border-cyan-400/30 text-cyan-400">
                        <Linkedin className="h-3 w-3" /> {a.platform}
                      </span>
                      {a.tags.slice(0, 2).map((t) => (
                        <span key={t} className="chip !px-2 !py-0.5 text-[10px]">{t}</span>
                      ))}
                    </div>

                    <h3 className="mt-4 text-lg font-semibold leading-snug text-white">{a.title}</h3>
                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-400">
                      {a.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                      <a href={a.href} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline">
                        Read on {a.platform} <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                      {a.internalHref && (
                        <Link href={a.internalHref}
                              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
                          <BookOpen className="h-3.5 w-3.5" /> Full version here
                        </Link>
                      )}
                      <span className="ml-auto text-xs text-slate-500">{fmt(a.date)}</span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </>
        )}

        <Reveal delay={120}>
          <div className="mt-6 card border-dashed p-8 text-center">
            <p className="text-sm font-semibold text-white">More articles on the way</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              We publish regularly on LinkedIn and Medium. Follow the page so you do not miss them.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
