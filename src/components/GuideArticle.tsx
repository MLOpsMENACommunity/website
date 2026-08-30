'use client'

import { useEffect } from 'react'

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

export default function GuideArticle({ html, copiedLabel }: { html: string; copiedLabel: string }) {
  useEffect(() => {
    const article = document.querySelector<HTMLElement>('.student-guide-prose')
    const revealElements = article ? Array.from(article.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)) : []
    article?.classList.add('guide-motion-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('guide-in-view')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -40px' })
    revealElements.forEach((element) => observer.observe(element))

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.student-guide-prose .copy-btn'))
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
  }, [copiedLabel])

  return <article lang="en" dir="ltr" className="student-guide-prose" dangerouslySetInnerHTML={{ __html: html }} />
}
