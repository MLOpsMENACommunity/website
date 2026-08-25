/**
 * Session state, derived from the clock rather than from which array a human
 * last dropped the session into.
 *
 * Pure on purpose — no `fs`, no `process` beyond the guarded read below — so a
 * client component can import it without dragging Node built-ins into the
 * browser bundle. The poster lookup, which does need `fs`, lives in
 * `sessions.server.ts`.
 */

import type { Session } from '~/data/sessions'
import type { Lang } from './i18n'

/** Sessions run about two hours unless the entry says otherwise. */
export const DEFAULT_DURATION_MINUTES = 120

export type SessionState =
  /** Not started. Registration is meaningful. */
  | 'upcoming'
  /** In its scheduled window right now. */
  | 'live'
  /** Over, but no recording published yet. */
  | 'ended'
  /** Over, recording available. */
  | 'archived'

export function sessionStartsAt(s: Session): number {
  return new Date(s.startsAt).getTime()
}

export function sessionEndsAt(s: Session): number {
  return sessionStartsAt(s) + (s.durationMinutes ?? DEFAULT_DURATION_MINUTES) * 60_000
}

/** The watch link, whether it came from a YouTube id or an explicit URL. */
export function recordingUrl(s: Session): string | undefined {
  if (s.recordingUrl) return s.recordingUrl
  return s.youtubeId ? `https://www.youtube.com/watch?v=${s.youtubeId}` : undefined
}

export function sessionState(s: Session, now: number): SessionState {
  if (now < sessionStartsAt(s)) return 'upcoming'
  if (now < sessionEndsAt(s)) return 'live'
  return recordingUrl(s) ? 'archived' : 'ended'
}

export function isOver(state: SessionState): boolean {
  return state === 'ended' || state === 'archived'
}

/**
 * Splits the list by state. `upcoming` runs soonest-first (it is a queue),
 * `past` runs newest-first (it is an archive).
 */
export function partitionSessions(sessions: readonly Session[], now: number) {
  const live: Session[] = []
  const upcoming: Session[] = []
  const past: Session[] = []

  for (const s of sessions) {
    const state = sessionState(s, now)
    if (state === 'live') live.push(s)
    else if (state === 'upcoming') upcoming.push(s)
    else past.push(s)
  }

  const byStart = (a: Session, b: Session) => sessionStartsAt(a) - sessionStartsAt(b)
  live.sort(byStart)
  upcoming.sort(byStart)
  past.sort((a, b) => sessionStartsAt(b) - sessionStartsAt(a))

  return { live, upcoming, past }
}

/**
 * "Now" for a build. `SESSION_NOW` lets you render a future state without
 * touching the system clock:
 *
 *     SESSION_NOW=2026-09-01T12:00:00Z npm run build
 *
 * Guarded so the expression is harmless if this module is ever pulled into a
 * client bundle.
 */
export function buildNow(): number {
  const override = typeof process !== 'undefined' ? process.env.SESSION_NOW : undefined
  return override ? new Date(override).getTime() : Date.now()
}

/**
 * The human-readable date, derived from `startsAt`.
 *
 * MUST be called on the server only. Node and the browser ship different ICU
 * versions, and `ar-EG` can produce Arabic-Indic digits in one and Latin in the
 * other — a hydration mismatch that would fire for Arabic readers on some
 * browsers and nowhere else. `-u-nu-latn` pins the numbering system; passing the
 * formatted string down as a prop keeps the formatting itself off the client.
 */
export function formatSessionDate(s: Session, lang: Lang): string {
  if (s.dateLabelOverride) return s.dateLabelOverride

  const formatted = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Cairo',
  }).format(new Date(s.startsAt))

  return `${formatted} ${lang === 'ar' ? 'بتوقيت القاهرة' : 'Cairo'}`
}
