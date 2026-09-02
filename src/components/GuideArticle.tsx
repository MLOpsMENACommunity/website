'use client'

import { useEffect, useRef } from 'react'

/* Keep this list in sync with the `.guide-motion-ready` selectors in
   `globals.css`: a block-level class that is missing from either side either
   never fades in or stays invisible forever. */
const REVEAL_SELECTOR = [
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'table',
  '.cards',
  '.flow',
  '.callout',
  '.code-window',
  '.guide-learning-path',
  '.guide-phase-marker',
  '.guide-stat-strip',
  '.guide-compare',
  '.guide-timeline',
].join(', ')

export default function GuideArticle({
  html,
  copiedLabel,
  active = true,
}: {
  html: string
  copiedLabel: string
  /* A levelled guide mounts every pane at once and displays one. An inactive
     pane has no layout, so its reveal wiring has to wait until it is shown. */
  active?: boolean
}) {
  /* Scoped to this instance rather than looked up by class, because a levelled
     guide renders one article per level and section. */
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const article = articleRef.current
    if (!article || !active) return

    article.classList.add('guide-motion-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('guide-in-view')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -40px' })

    /* Anything already on screen — or scrolled past — is revealed outright.
       Observing it instead would rely on an intersection callback firing for an
       element that has only just gained a box, which it does not do reliably. */
    article.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add('guide-in-view')
      else observer.observe(element)
    })

    const buttons = Array.from(article.querySelectorAll<HTMLButtonElement>('.copy-btn'))
    const cleanups = buttons.map((button) => {
      const copy = async () => {
        const code = button.closest('.code-window')?.querySelector('pre')?.innerText
        if (!code) return
        await navigator.clipboard.writeText(code)
        const original = button.textContent
        button.textContent = copiedLabel
        window.setTimeout(() => { button.textContent = original }, 1600)
      }
      button.addEventListener('click', copy)
      return () => button.removeEventListener('click', copy)
    })
    return () => {
      observer.disconnect()
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [active, copiedLabel])

  return (
    <article
      ref={articleRef}
      lang="en"
      dir="ltr"
      className="student-guide-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
