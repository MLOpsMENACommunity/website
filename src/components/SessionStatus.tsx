'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { SessionState } from '@/lib/sessions'

/**
 * Keeps a session's badge and call-to-action honest between builds.
 *
 * The static export freezes whatever was true at build time, and the scheduled
 * rebuild is six-hourly — so for a few hours after a session airs the page can
 * still be claiming "Registration open". These components recompute in the
 * browser and correct it.
 *
 * They follow `Counter`'s mirror pattern rather than `Countdown`'s
 * blank-then-fill one: state is SEEDED with the server's own answer, so the
 * first client render is byte-identical to the exported HTML and there is no
 * hydration mismatch. Only after mount does it recompute.
 *
 * Everything user-visible arrives pre-translated and pre-formatted as props.
 * These components deliberately never call `t()` or `Intl` — see the ICU
 * mismatch note in src/lib/sessions.ts.
 */
function useLiveState(
  startsAt: string,
  endsAt: string,
  hasRecording: boolean,
  buildState: SessionState,
): SessionState {
  const [state, setState] = useState<SessionState>(buildState)

  useEffect(() => {
    const start = new Date(startsAt).getTime()
    const end = new Date(endsAt).getTime()

    const compute = (): SessionState => {
      const now = Date.now()
      if (now < start) return 'upcoming'
      if (now < end) return 'live'
      return hasRecording ? 'archived' : 'ended'
    }

    setState(compute())
    const id = setInterval(() => setState(compute()), 30_000)
    return () => clearInterval(id)
  }, [startsAt, endsAt, hasRecording])

  return state
}

type StatusProps = {
  startsAt: string
  endsAt: string
  hasRecording: boolean
  buildState: SessionState
  /** Pre-translated copy for every state. */
  labels: Record<SessionState, string>
}

/**
 * The state chip.
 *
 * `className` styles every state the same; `classNames` overrides per state.
 * Both are plain serialisable values on purpose — a function prop cannot cross
 * the server/client boundary in an RSC payload, and it fails at build time only
 * once a session happens to be in the state that renders it.
 */
export function SessionBadge({
  className = 'chip',
  classNames,
  ...props
}: StatusProps & {
  className?: string
  classNames?: Partial<Record<SessionState, string>>
}) {
  const state = useLiveState(props.startsAt, props.endsAt, props.hasRecording, props.buildState)
  return <span className={classNames?.[state] ?? className}>{props.labels[state]}</span>
}

/**
 * Renders `children` only while the session can still be attended. Wraps the
 * "Register free" CTA so it disappears the moment the session is over, rather
 * than inviting people to register for something that already happened.
 */
export function RegisterGate({
  children,
  ...props
}: Omit<StatusProps, 'labels'> & { children: ReactNode }) {
  const state = useLiveState(props.startsAt, props.endsAt, props.hasRecording, props.buildState)
  if (state === 'ended' || state === 'archived') return null
  return <>{children}</>
}

/**
 * The action link on a course lesson.
 *
 * A YouTube live URL exists from the moment a stream is scheduled, so the link
 * alone says nothing about whether there is anything to watch. Before the
 * lesson airs the same URL is a reminder page, which is why the href never
 * changes — only what the link honestly claims to be.
 */
export function LessonAction({
  href,
  labels,
  ...props
}: Omit<StatusProps, 'labels'> & {
  href: string
  labels: { upcoming: string; live: string; past: string }
}) {
  const state = useLiveState(props.startsAt, props.endsAt, props.hasRecording, props.buildState)
  const text = state === 'upcoming' ? labels.upcoming : state === 'live' ? labels.live : labels.past
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint transition hover:text-cyan-400"
    >
      {text}
    </a>
  )
}
