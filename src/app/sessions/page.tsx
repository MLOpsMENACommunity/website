import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, User, PlayCircle, Ticket, ArrowRight } from 'lucide-react'
import Reveal from '@/components/Reveal'
import Countdown from '@/components/Countdown'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { upcomingSessions, pastSessions } from '~/data/sessions'
import { course } from '~/data/mlops-practitioner'
import { channels } from '~/site.config'

export const metadata: Metadata = {
  title: 'Sessions',
  description:
    'Free live sessions on production machine learning — upcoming sessions with registration, and past sessions with recordings.',
}

export default function SessionsPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">Sessions</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Live sessions, <span className="brand-text">free to attend</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Practitioners walking through what they actually run in production. Register on
            Zomra, attend live, and catch the recording on YouTube afterwards.
          </p>
        </div>
      </section>

      {/* ---------- Upcoming ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <span className="eyebrow">Upcoming</span>
        </Reveal>

        <div className="mt-8 space-y-5">
          {upcomingSessions.map((s, i) => (
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
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">
                        Registration open
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{s.title}</h2>
                    <p className="mt-2 text-base text-muted">{s.subtitle}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="chip"><CalendarDays className="h-3 w-3" />{s.dateLabel}</span>
                      <span className="chip"><User className="h-3 w-3" />{s.speaker} · {s.speakerRole}</span>
                    </div>

                    {s.topics.length > 0 && (
                      <>
                        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-faint">
                          What is covered
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {s.topics.map((t) => (
                            <span key={t} className="chip !px-2.5 !py-1 text-[11px]">{t}</span>
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

                  <div className="self-start rounded-2xl border border-line bg-surface p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                      Starts in
                    </p>
                    <div className="mt-4"><Countdown iso={s.startsAt} /></div>
                    {s.registerUrl && (
                      <a href={s.registerUrl} target="_blank" rel="noreferrer" className="btn-primary mt-6 w-full">
                        <Ticket className="h-4 w-4" /> Register free
                      </a>
                    )}
                    <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost mt-2 w-full">
                      Get reminders
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}

          {upcomingSessions.length === 0 && (
            <div className="card border-dashed p-12 text-center">
              <p className="text-sm text-faint">No sessions scheduled right now.</p>
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
                <span className="eyebrow">Course sessions</span>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                  The MLOps Practitioner <span className="brand-text">recordings</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  All five lessons of Cohort 1, streamed live on YouTube.
                </p>
              </div>
              <Link href="/courses/mlops-practitioner" className="btn-ghost shrink-0">
                Course details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {course.recordings.map((r, i) => (
              <Reveal key={r.n} delay={i * 60}>
                <a href={r.href} target="_blank" rel="noreferrer"
                   className="card card-hover group flex h-full items-start gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 font-mono text-sm font-bold text-cyan-400">
                    {String(r.n).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-fg">
                      {r.module}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint transition group-hover:text-cyan-400">
                      <PlayCircle className="h-3.5 w-3.5" /> Watch on YouTube
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Past ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <span className="eyebrow">Past sessions</span>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {pastSessions.map((s, i) => (
            <Reveal key={s.slug} delay={i * 80}>
              <article className="card card-hover flex h-full flex-col p-6">
                <h3 className="text-xl font-bold leading-snug text-fg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.subtitle}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip"><CalendarDays className="h-3 w-3" />{s.dateLabel}</span>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">
                  <span className="text-body">{s.speaker}</span> · {s.speakerRole}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  {s.recordingUrl && (
                    <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="btn-primary !px-4 !py-2">
                      <PlayCircle className="h-4 w-4" /> Watch recording
                    </a>
                  )}
                  {s.sessionPageUrl && (
                    <a href={s.sessionPageUrl} target="_blank" rel="noreferrer" className="btn-ghost !px-4 !py-2">
                      Session page <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
