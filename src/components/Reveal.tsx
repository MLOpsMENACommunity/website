'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Where the element travels in from. See the `.reveal-*` classes in globals.css. */
export type RevealVariant = 'up' | 'fade' | 'scale' | 'blur' | 'start' | 'end'

/** An element is "in" once its top has crossed this far above the viewport bottom. */
const TRIGGER_INSET = 60

/**
 * One shared, throttled listener for every pending element on the page.
 *
 * Deliberately NOT an IntersectionObserver. IO only calls back when the
 * intersection *ratio crosses a configured threshold*, which breaks in two ways
 * that matter here: an element taller than the viewport can never reach a ratio
 * like 0.12, and an element the page jumps clean past (anchor link, restored
 * scroll) goes not-intersecting → not-intersecting without ever notifying. Both
 * leave content stuck at opacity 0. A position check on scroll has neither
 * problem, and the reasoning is airtight: hidden content can only reach the
 * viewport through a scroll or a resize, and both fire events.
 */
const pending = new Set<HTMLElement>()
let scheduled = 0
let listening = false

function reveal(el: HTMLElement) {
  el.classList.add('is-visible')
  pending.delete(el)
}

function flush() {
  scheduled = 0
  const limit = window.innerHeight - TRIGGER_INSET
  for (const el of Array.from(pending)) {
    if (el.getBoundingClientRect().top < limit) reveal(el)
  }
  if (pending.size === 0) stopListening()
}

/**
 * Coalesces a burst of scroll events into one layout read per task. A timer
 * rather than requestAnimationFrame on purpose: rAF is the usual choice, but it
 * is one more thing that has to fire for content to become visible, and the set
 * being measured is small and empties as it reveals.
 */
function schedule() {
  if (!scheduled) scheduled = window.setTimeout(flush, 0)
}

const EVENTS = ['scroll', 'resize', 'orientationchange'] as const

function startListening() {
  if (listening) return
  listening = true
  for (const e of EVENTS) window.addEventListener(e, schedule, { passive: true })
}

function stopListening() {
  if (!listening) return
  listening = false
  for (const e of EVENTS) window.removeEventListener(e, schedule)
}

/**
 * Fades children into view on scroll.
 *
 * Fail-visible by construction: the element renders with NO reveal class, so
 * without JavaScript the content is simply there. The hidden state is applied
 * only to elements that both start below the fold and are shorter than the
 * viewport — so nothing flashes out of view above the fold, and nothing tall
 * enough to fill the screen can ever be caught mid-animation.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  variant = 'up',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  variant?: RevealVariant
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const box = el.getBoundingClientRect()

    // Already on screen at mount — leave it alone rather than hiding then
    // re-showing it, which would read as a flicker above the fold.
    if (box.top < window.innerHeight - TRIGGER_INSET) return

    // Never hide anything taller than the viewport: fading a whole screenful in
    // as one block is not the effect, and it is the case most likely to leave a
    // reader staring at empty space.
    if (box.height > window.innerHeight) return

    el.classList.add('reveal', `reveal-${variant}`)
    pending.add(el)
    startListening()

    return () => {
      pending.delete(el)
      if (pending.size === 0) stopListening()
    }
  }, [variant])

  const Comp = Tag as React.ElementType

  return (
    <Comp ref={ref} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Comp>
  )
}
