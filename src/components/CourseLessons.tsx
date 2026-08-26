import { ArrowUpRight, CalendarDays, PlayCircle } from 'lucide-react'
import Reveal from './Reveal'
import { SessionBadge, LessonAction } from './SessionStatus'
import { course } from '~/data/mlops-practitioner'
import { buildNow, formatSessionDate, sessionEndsAt, sessionState, type SessionState } from '@/lib/sessions'
import { t, type Lang } from '@/lib/i18n'

/**
 * The five live lessons of the running cohort.
 *
 * Every lesson has had a YouTube URL since the day it was scheduled, so the
 * grid used to offer "Watch on YouTube" for talks that were still weeks away.
 * State comes from `airsAt` instead, and a lesson that has not happened yet
 * says so and links to its reminder page.
 */
export default function CourseLessons({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const now = buildNow()

  const labels: Record<SessionState, string> = {
    upcoming: copy.common.scheduled,
    live: copy.common.liveNow,
    ended: copy.common.recordingSoon,
    archived: copy.common.recordingAvailable,
  }

  return (
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {course.recordings.map((r, i) => {
        // A lesson's own URL is its recording once it has aired.
        const timed = { startsAt: r.airsAt, durationMinutes: 90, recordingUrl: r.href }
        const state = sessionState(timed, now)
        const endsAt = new Date(sessionEndsAt(timed)).toISOString()
        const aired = state === 'ended' || state === 'archived'

        return (
          <Reveal key={r.n} delay={i * 60}>
            <div className="card card-hover group flex h-full items-start gap-4 p-5">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold ${
                  aired ? 'bg-cyan-400/10 text-cyan-400' : 'bg-surface-2 text-faint'
                }`}
              >
                {String(r.n).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-fg">{r.module}</span>

                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <SessionBadge
                    startsAt={r.airsAt}
                    endsAt={endsAt}
                    hasRecording
                    buildState={state}
                    labels={labels}
                    className="chip !px-2 !py-0.5 text-[10px]"
                    classNames={{
                      upcoming: 'chip !px-2 !py-0.5 text-[10px] border-amber-400/35 text-amber-400',
                      live: 'chip !px-2 !py-0.5 text-[10px] border-coral/40 text-coral',
                    }}
                  />
                  {!aired && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                      <CalendarDays className="h-3 w-3" />
                      {formatSessionDate(timed, lang)}
                    </span>
                  )}
                </span>

                <LessonAction
                  href={r.href}
                  startsAt={r.airsAt}
                  endsAt={endsAt}
                  hasRecording
                  buildState={state}
                  labels={{
                    upcoming: copy.common.setReminder,
                    live: copy.common.joinLive,
                    past: copy.sessionsPage.watchOnYoutube,
                  }}
                />
              </span>

              {aired ? (
                <PlayCircle className="h-4 w-4 shrink-0 text-ghost transition group-hover:text-cyan-400" />
              ) : (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ghost transition group-hover:text-cyan-400" />
              )}
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
