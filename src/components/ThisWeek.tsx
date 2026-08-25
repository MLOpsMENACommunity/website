import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, CalendarDays, Mic, Ticket } from 'lucide-react'
import Countdown from './Countdown'
import Reveal from './Reveal'
import { SessionBadge, RegisterGate } from './SessionStatus'
import { sessions } from '~/data/sessions'
import { channels, primaryChannel } from '~/site.config'
import {
  buildNow, formatSessionDate, partitionSessions, sessionEndsAt, sessionState,
  type SessionState,
} from '@/lib/sessions'
import { sessionPoster } from '@/lib/sessions.server'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { tSession } from '@/lib/content-i18n'

/**
 * The homepage's loudest section: whatever is running this week, presented like
 * the session poster it is. Deliberately the only full-bleed tinted band above
 * the fold-and-a-half, so it reads as an announcement rather than another card.
 */
export default function ThisWeek({ lang = 'en' }: { lang?: Lang }) {
  const copy = t(lang)
  const c = copy.home.thisWeek
  const now = buildNow()

  // A live session outranks a merely scheduled one. Both lists are sorted by
  // start time, so "featured" is correct by construction rather than by
  // whatever order someone happened to type the entries in.
  const { live, upcoming } = partitionSessions(sessions, now)
  const [featured, ...rest] = [...live, ...upcoming].map((s) => tSession(lang, s))

  const labels: Record<SessionState, string> = {
    upcoming: copy.common.registrationOpen,
    live: copy.common.liveNow,
    ended: copy.common.recordingSoon,
    archived: copy.common.recordingAvailable,
  }

  return (
    <section className="relative overflow-hidden border-y border-cyan-400/25">
      {/* Accent wash — the teal→amber sweep of the mark, at poster strength. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal/[0.12] via-cyan-400/[0.07] to-amber/[0.12]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px brand-gradient" />

      <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
        <Reveal variant="blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
              {c.eyebrow}
            </span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              {c.title} <span className="brand-text">{c.accent}</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{c.lead}</p>
          </div>
          <Link href={localeHref(lang, '/sessions')} className="btn-ghost group shrink-0">
            {copy.common.allSessions}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
        </Reveal>

        {featured ? (
          <Reveal variant="scale" delay={80}>
          <article className="card group/poster mt-10 overflow-hidden !border-cyan-400/30 shadow-lg">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              {/* Poster */}
              <div className="relative h-56 w-full overflow-hidden bg-surface-2 sm:h-72 lg:h-full lg:min-h-[22rem]">
                <Image
                  src={sessionPoster(featured)}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 34rem"
                  className="object-cover object-top transition-transform duration-[900ms] ease-out group-hover/poster:scale-[1.04]"
                  priority
                />
              </div>

              {/* Details */}
              <div className="flex flex-col p-6 sm:p-8">
                <SessionBadge
                  startsAt={featured.startsAt}
                  endsAt={new Date(sessionEndsAt(featured)).toISOString()}
                  hasRecording={Boolean(featured.youtubeId ?? featured.recordingUrl)}
                  buildState={sessionState(featured, now)}
                  labels={{ ...labels, upcoming: c.nextSession }}
                  className="chip w-fit"
                  classNames={{
                    upcoming: 'chip w-fit border-amber-400/35 text-amber-400',
                    live: 'chip w-fit border-coral/40 text-coral',
                  }}
                />

                <h3 className="mt-4 text-2xl font-bold leading-snug text-fg sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{featured.subtitle}</p>

                <div className="mt-5 space-y-2 text-sm text-muted">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-cyan-400" />
                    {formatSessionDate(featured, lang)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mic className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="text-body">{featured.speaker}</span> · {featured.speakerRole}
                  </p>
                </div>

                {featured.topics.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {featured.topics.slice(0, 6).map((topic) => (
                      <span key={topic} className="chip !px-2.5 !py-1 text-[11px]">{topic}</span>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Countdown
                    iso={featured.startsAt}
                    endsAt={new Date(sessionEndsAt(featured)).toISOString()}
                    lang={lang}
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {featured.registerUrl && (
                    <RegisterGate
                      startsAt={featured.startsAt}
                      endsAt={new Date(sessionEndsAt(featured)).toISOString()}
                      hasRecording={Boolean(featured.youtubeId ?? featured.recordingUrl)}
                      buildState={sessionState(featured, now)}
                    >
                      <a href={featured.registerUrl} target="_blank" rel="noreferrer"
                         className="btn-primary flex-1 !px-4 !py-2.5">
                        <Ticket className="h-4 w-4" />
                        {copy.common.registerFree}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </RegisterGate>
                  )}
                  <a href={channels[primaryChannel]} target="_blank" rel="noreferrer"
                     className="btn-ghost !px-4 !py-2.5">
                    {copy.sessionsPage.getReminders}
                  </a>
                </div>

                {featured.note && (
                  <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint">
                    {featured.note}
                  </p>
                )}
              </div>
            </div>
          </article>
          </Reveal>
        ) : (
          <div className="card mt-10 border-dashed p-10 text-center">
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted">{c.nothing}</p>
            <Link href={localeHref(lang, '/sessions')} className="btn-ghost mt-6">
              {c.browseAll} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        )}

        {rest.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {rest.map((s, i) => (
              <Reveal key={s.slug} delay={i * 80}>
              <article className="card card-hover flex h-full flex-col p-5">
                <SessionBadge
                  startsAt={s.startsAt}
                  endsAt={new Date(sessionEndsAt(s)).toISOString()}
                  hasRecording={Boolean(s.youtubeId ?? s.recordingUrl)}
                  buildState={sessionState(s, now)}
                  labels={labels}
                  className="chip w-fit border-amber-400/30 text-amber-400"
                />
                <h3 className="mt-3 text-base font-semibold leading-snug text-fg">{s.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.subtitle}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-faint">
                  <CalendarDays className="h-3.5 w-3.5" />{formatSessionDate(s, lang)}
                </p>
                {s.registerUrl && (
                  <a href={s.registerUrl} target="_blank" rel="noreferrer"
                     className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:underline">
                    <Ticket className="h-4 w-4" /> {copy.common.registerFree}
                  </a>
                )}
              </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
