'use client'

import { useEffect, useRef, useState } from 'react'

/** Counts up to `value` the first time it scrolls into view. */
export default function Counter({
  value,
  suffix = '',
  duration = 1600,
}: {
  value: number
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  // Starts at the final value so the static export and hydration both show the
  // real number; the effect resets to 0 only when JS is available to animate.
  const [display, setDisplay] = useState(value)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Already on screen at mount — leave the real number in place. Zeroing it
    // here would blank the figure if the observer never fires.
    if (el.getBoundingClientRect().top < window.innerHeight - 40) return

    setDisplay(0)

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      io.disconnect()

      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        // easeOutExpo — fast start, gentle settle
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        setDisplay(Math.round(value * eased))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })

    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  const formatted = display >= 1000 ? `${(display / 1000).toFixed(display % 1000 === 0 ? 0 : 1)}K` : String(display)

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  )
}
