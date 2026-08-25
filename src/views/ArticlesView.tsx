import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Linkedin, BookOpen, CalendarDays } from 'lucide-react'
import Reveal from '@/components/Reveal'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { externalArticles } from '~/data/articles'
import { channels } from '~/site.config'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { tArticle } from '@/lib/content-i18n'

/**
 * Without an explicit timeZone this inherits the machine's — UTC on the CI
 * runner, Cairo on a laptop — so an article published at 01:00 Cairo renders a
 * day early in production. `-u-nu-latn` pins Latin digits so Arabic dates match
 * the Latin figures used everywhere else on the page.
 */
function fmt(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo',
  })
}

export default function ArticlesView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.articlesPage
  const articles = [...externalArticles].sort((a, b) => (a.date < b.date ? 1 : -1))
  const [leadRaw, ...restRaw] = articles
  const lead = leadRaw && tArticle(lang, leadRaw)

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.lead}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={channels.linkedin} target="_blank" rel="noreferrer" className="btn-primary">
              <Linkedin className="h-4 w-4" /> {c.follow}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        {!lead ? (
          <div className="card border-dashed p-12 text-center">
            <p className="text-sm text-faint">{c.none}</p>
          </div>
        ) : (
          <>
            <Reveal>
              <article className="card card-hover group relative overflow-hidden p-7 sm:p-10">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal/10 blur-3xl" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border-cyan-400/30 text-cyan-400">
                      <Linkedin className="h-3 w-3" /> {leadRaw.platform}
                    </span>
                    {leadRaw.tags.map((tag) => (
                      <span key={tag} className="chip !px-2 !py-0.5 text-[10px]">{tag}</span>
                    ))}
                  </div>

                  <h2 className="mt-5 max-w-3xl text-2xl font-bold leading-snug text-fg sm:text-3xl">
                    {lead.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                    {lead.description}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a href={leadRaw.href} target="_blank" rel="noreferrer" className="btn-primary !px-5 !py-2.5">
                      {copy.common.readOn} {leadRaw.platform} <ArrowUpRight className="h-4 w-4" />
                    </a>
                    {leadRaw.internalHref && (
                      <Link href={localeHref(lang, leadRaw.internalHref)} className="btn-ghost !px-5 !py-2.5">
                        {c.readItHere} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                      </Link>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-faint">
                      <CalendarDays className="h-3.5 w-3.5" />{fmt(leadRaw.date, lang)}
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {restRaw.map((raw, i) => {
                const a = tArticle(lang, raw)
                return (
                  <Reveal key={raw.href} delay={i * 80}>
                    <article className="card card-hover flex h-full flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip border-cyan-400/30 text-cyan-400">
                          <Linkedin className="h-3 w-3" /> {raw.platform}
                        </span>
                        {raw.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="chip !px-2 !py-0.5 text-[10px]">{tag}</span>
                        ))}
                      </div>

                      <h3 className="mt-4 text-lg font-semibold leading-snug text-fg">{a.title}</h3>
                      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{a.description}</p>

                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                        <a href={raw.href} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline">
                          {copy.common.readOn} {raw.platform} <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        {raw.internalHref && (
                          <Link href={localeHref(lang, raw.internalHref)}
                                className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
                            <BookOpen className="h-3.5 w-3.5" /> {c.fullVersion}
                          </Link>
                        )}
                        <span className="ms-auto text-xs text-faint">{fmt(raw.date, lang)}</span>
                      </div>
                    </article>
                  </Reveal>
                )
              })}
            </div>
          </>
        )}

        <Reveal delay={120}>
          <div className="mt-6 card border-dashed p-8 text-center">
            <p className="text-sm font-semibold text-fg">{c.moreTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-faint">{c.moreLead}</p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
