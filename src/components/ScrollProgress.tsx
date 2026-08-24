'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Reading-progress hairline under the header, plus a back-to-top button that
 * appears once there is something to scroll back up to.
 *
 * The bar is driven by a transform on a ref rather than React state, so a fast
 * scroll does not queue a render per frame.
 */
export default function ScrollProgress({ label }: { label: string }) {
  const bar = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`
      setShowTop(window.scrollY > window.innerHeight * 1.2)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-16 z-50 h-0.5 overflow-hidden"
      >
        <div
          ref={bar}
          className="h-full w-full origin-left brand-gradient rtl:origin-right"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={label}
        title={label}
        className={`fixed bottom-6 end-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-nav text-muted backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50 hover:text-cyan-400 ${
          showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </>
  )
}
