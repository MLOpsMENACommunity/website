import Link from 'next/link'
import { ArrowUpRight, CalendarDays, User, PlayCircle, Ticket, ArrowRight } from 'lucide-react'
import Reveal from '@/components/Reveal'
import Countdown from '@/components/Countdown'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import CourseLessons from '@/components/CourseLessons'
import { SessionBadge, RegisterGate } from '@/components/SessionStatus'
import { sessions } from '~/data/sessions'
import { course } from '~/data/mlops-practitioner'
import { channels } from '~/site.config'
import { t, localeHref, type Lang } from '@/lib/i18n'
import {
  buildNow, formatSessionDate, partitionSessions, recordingUrl, sessionEndsAt, sessionState,
  type SessionState,
} from '@/lib/sessions'
import { tSession } from '@/lib/content-i18n'
import UntranslatedChip from '@/components/UntranslatedChip'
import JsonLd from '@/components/JsonLd'
import { eventSchema } from '@/lib/schema'

export default function SessionsView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.sessionsPage
  const now = buildNow()
  const partitioned = partitionSessions(sessions, now)
  // A live session belongs at the top of "Upcoming", not buried in the archive.
  const upcoming = [...partitioned.live, ...partitioned.upcoming].map((s) => tSession(lang, s))
  const past = partitioned.past.map((s) => tSession(lang, s))

  const labels: Record<SessionState, string> = {
    upcoming: copy.common.registrationOpen,
    live: copy.common.liveNow,
    ended: copy.common.recordingSoon,
    archived: copy.common.recordingAvailable,
  }

  return (
    <>
      {/* Only sessions that have not finished — a past date in an Event node
          is valid but earns nothing. */}
      {upcoming.map((s) => (
        <JsonLd key={s.slug} data={eventSchema(s, lang)} />
      ))}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.lead}</p>
        </div>
      </section>

      {/* ---------- Upcoming ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <span className="eyebrow">{c.upcoming}</span>
        </Reveal>

        <div className="mt-8 space-y-5">
          {upcoming.map((s, i) => (
            <Reveal key={s.slug} delay={i * 80}>
              <article className="card relative overflow-hidden p-7 sm:p-9">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber/10 blur-3xl" />
                <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                      </span>
                      <SessionBadge
                        startsAt={s.startsAt}
                        endsAt={new Date(sessionEndsAt(s)).toISOString()}
                        hasRecording={Boolean(recordingUrl(s))}
                        buildState={sessionState(s, now)}
                        labels={labels}
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400"
                      />
                    </div>

                    <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{s.title}</h2>
                    <p className="mt-2 text-base text-muted">{s.subtitle}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="chip">
                        <CalendarDays className="h-3 w-3" />{formatSessionDate(s, lang)}
                      </span>
                      <span className="chip"><User className="h-3 w-3" />{s.speaker} · {s.speakerRole}</span>
                    </div>

                    {s.topics.length > 0 && (
                      <>
                        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                          {c.whatIsCovered}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {s.topics.map((topic) => (
                            <span key={topic} className="chip !px-2.5 !py-1 text-[11px]">{topic}</span>
                          ))}
                        </div>
                      </>
                    )}

                    {s.note && (
                      <p className="mt-5 rounded-xl border border-teal/25 bg-teal/[0.06] p-4 text-sm text-body">
                        {s.note}
                      </p>
                    )}
                  </div>

                  <div className="self-start rounded-2xl border border-line bg-surface-2 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                      {copy.common.startsIn}
                    </p>
                    <div className="mt-4">
                      <Countdown
                        iso={s.startsAt}
                        endsAt={new Date(sessionEndsAt(s)).toISOString()}
                        lang={lang}
                      />
                    </div>
                    {s.registerUrl && (
                      <RegisterGate
                        startsAt={s.startsAt}
                        endsAt={new Date(sessionEndsAt(s)).toISOString()}
                        hasRecording={Boolean(recordingUrl(s))}
                        buildState={sessionState(s, now)}
                      >
                        <a href={s.registerUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                          <Ticket className="h-4 w-4" /> {copy.common.registerFree}
                        </a>
                      </RegisterGate>
                    )}
                    <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost mt-2 w-full">
                      {c.getReminders}
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}

          {upcoming.length === 0 && (
            <div className="card border-dashed p-12 text-center">
              <p className="text-sm text-faint">{c.noneScheduled}</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Course sessions ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">{c.courseSessions}</span>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                  {c.courseTitleBefore} <span className="brand-text">{c.courseTitleAccent}</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{c.courseLead}</p>
              </div>
              <Link href={localeHref(lang, '/courses/mlops-practitioner')} className="btn-ghost shrink-0">
                {c.courseDetails} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </Reveal>

          <CourseLessons lang={lang} />
        </div>
      </section>

      {/* ---------- Past ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <span className="eyebrow">{c.past}</span>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {past.map((s, i) => (
            <Reveal key={s.slug} delay={i * 80}>
              <article className="card card-hover flex h-full flex-col p-6">
                <h3 className="text-xl font-bold leading-snug text-fg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.subtitle}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip">
                    <CalendarDays className="h-3 w-3" />{formatSessionDate(s, lang)}
                  </span>
                  <UntranslatedChip lang={lang} kind="session" itemKey={s.slug} />
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">
                  <span className="text-body">{s.speaker}</span> · {s.speakerRole}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {recordingUrl(s) ? (
                    <a href={recordingUrl(s)} target="_blank" rel="noreferrer" className="btn-primary !px-4 !py-2">
                      <PlayCircle className="h-4 w-4" /> {copy.common.watchRecording}
                    </a>
                  ) : (
                    <span className="chip text-faint">{copy.common.recordingSoon}</span>
                  )}
                  {s.sessionPageUrl && (
                    <a href={s.sessionPageUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-4 !py-2">
                      {c.sessionPage} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
