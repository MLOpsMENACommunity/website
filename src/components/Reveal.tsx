'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Fades + lifts children into view on scroll.
 *
 * Deliberately fail-visible: the element renders with NO reveal class, so
 * without JavaScript (or if the observer never fires) the content is simply
 * visible. The hidden state is only applied by the effect below, and only to
 * elements that start below the fold — so nothing ever flashes out of view.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Already on screen at mount — leave it alone rather than hiding then
    // re-showing it, which would read as a flicker above the fold.
    if (el.getBoundingClientRect().top < window.innerHeight - 60) return

    el.classList.add('reveal')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.classList.add('is-visible')
        io.disconnect() // reveal once, never re-hide
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const Comp = Tag as React.ElementType

  return (
    <Comp ref={ref} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Comp>
  )
}
