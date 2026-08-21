'use client'

import { useEffect, useState } from 'react'

type Parts = { days: number; hours: number; minutes: number; seconds: number }

function diff(target: number): Parts | null {
  const ms = target - Date.now()
  if (ms <= 0) return null
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  }
}

/**
 * Live countdown to the next session. Renders nothing until mounted so the
 * static export and the first client render agree (no hydration mismatch).
 */
export default function Countdown({ iso }: { iso: string }) {
  const target = new Date(iso).getTime()
  const [parts, setParts] = useState<Parts | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setParts(diff(target))
    const id = setInterval(() => setParts(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!mounted) {
    return <div className="h-[86px]" aria-hidden />
  }

  if (!parts) {
    return (
      <div className="flex items-center gap-2.5 text-sm font-semibold text-amber-400">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
        </span>
        This session has started — join us live
      </div>
    )
  }

  const cells: [string, number][] = [
    ['Days', parts.days],
    ['Hours', parts.hours],
    ['Minutes', parts.minutes],
    ['Seconds', parts.seconds],
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="timer" aria-live="off">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center"
        >
          <div className="font-mono text-2xl font-bold tabular-nums text-white">
            {String(value).padStart(2, '0')}
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
