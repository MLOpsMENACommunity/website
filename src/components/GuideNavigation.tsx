'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, Search, X } from 'lucide-react'
import type { GuideHeading } from '@/lib/student-guides.server'

type Labels = {
  onThisPage: string
  searchGuide: string
  searchGuidePlaceholder: string
  clearSearch: string
  noSectionResults: string
  readingProgress: string
}

function GuideLinks({
  headings,
  activeId,
  onNavigate,
}: {
  headings: GuideHeading[]
  activeId: string
  onNavigate?: () => void
}) {
  return (
    <nav lang="en" dir="ltr" aria-label="Guide contents" className="guide-toc-links">
      {headings.map((heading) => {
        const numberedTitle = heading.level === 2 ? heading.title.match(/^(\d{2})\s+(.+)$/) : null
        return (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            data-level={heading.level}
            data-active={activeId === heading.id}
            onClick={onNavigate}
          >
            {numberedTitle && <b>{numberedTitle[1]}</b>}
            <span>{numberedTitle?.[2] ?? heading.title}</span>
          </a>
        )
      })}
    </nav>
  )
}

export default function GuideNavigation({
  headings,
  labels,
  title,
  eyebrow,
  scopeId,
  pinnedHeadings,
}: {
  headings: GuideHeading[]
  labels: Labels
  title: string
  /* Overrides the small label above the title; a levelled guide puts the
     current level there. */
  eyebrow?: string
  /* Id of the element holding the article this navigation describes. A levelled
     guide has several, only one of them visible. */
  scopeId?: string
  /* Cross-cutting entries kept at the top of the list whatever pane is open —
     the Quick Start section lives above the grid and belongs to no pane, so its
     link must not swap out with the pane headings. */
  pinnedHeadings?: GuideHeading[]
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [progress, setProgress] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pinned = pinnedHeadings ?? []
  const matchesQuery = (heading: GuideHeading) =>
    heading.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  const filtered = query.trim()
    ? [...pinned.filter(matchesQuery), ...headings.filter(matchesQuery)]
    : [...pinned, ...headings.filter((heading) => heading.level === 2)]
  const spied = [...pinned, ...headings]
  const activeHeading = spied.find((heading) => heading.id === activeId)
  const activeIndex = spied.findIndex((heading) => heading.id === activeId)
  const activeSection = [...spied.slice(0, activeIndex + 1)].reverse().find((heading) => heading.level === 2)
  const navigationActiveId = query.trim() ? activeId : activeSection?.id ?? activeId

  useEffect(() => {
    const article = () =>
      scopeId
        ? document.getElementById(scopeId)?.querySelector<HTMLElement>('.student-guide-prose') ?? null
        : document.querySelector<HTMLElement>('.student-guide-prose')

    const update = () => {
      /* Heading ids are unique across every pane, so this only ever resolves to
         elements inside the one on screen. Pinned headings (Quick Start) sit
         above the grid, so they lead the list for the scroll-spy. */
      const elements = [...pinned, ...headings]
        .map((heading) => document.getElementById(heading.id))
        .filter((element): element is HTMLElement => Boolean(element))
      const current = [...elements].reverse().find((element) => element.getBoundingClientRect().top <= 150) ?? elements[0]
      if (current) setActiveId(current.id)

      const element = article()
      if (!element) return
      const start = element.offsetTop - 120
      const max = element.offsetHeight - window.innerHeight + 180
      setProgress(Math.max(0, Math.min(100, ((window.scrollY - start) / max) * 100)))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
    /* `pinned` is a fresh array each render; key the effect on its ids so it is
       stable but still re-runs if the pinned set ever changes. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings, scopeId, pinned.map((heading) => heading.id).join('|')])

  useEffect(() => {
    const scope = scopeId ? document.getElementById(scopeId) : document
    scope?.querySelectorAll('.student-guide-prose h2, .student-guide-prose h3').forEach((heading) => {
      heading.toggleAttribute('data-current', heading.id === activeId)
    })
  }, [activeId, scopeId])

  const search = (id: string) => (
    <div className="guide-search">
      <Search aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{labels.searchGuide}</label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={labels.searchGuidePlaceholder}
      />
      {query && (
        <button type="button" onClick={() => setQuery('')} aria-label={labels.clearSearch}>
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  )

  return (
    <>
      <div className="guide-mobile-nav lg:hidden" data-open={mobileOpen}>
        <div className="guide-progress" aria-label={`${labels.readingProgress}: ${Math.round(progress)}%`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <button type="button" className="guide-mobile-trigger" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen}>
          <span>
            <small>{eyebrow ?? labels.onThisPage}</small>
            <strong lang="en" dir="ltr">{activeHeading?.title}</strong>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
        <div className="guide-mobile-panel">
          <div>{search('guide-content-search-mobile')}</div>
          {filtered.length > 0 ? <GuideLinks headings={filtered} activeId={navigationActiveId} onNavigate={() => setMobileOpen(false)} /> : <p className="guide-no-results">{labels.noSectionResults}</p>}
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="guide-desktop-nav">
          <div className="guide-progress" aria-label={`${labels.readingProgress}: ${Math.round(progress)}%`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="guide-nav-heading">
            <BookOpen aria-hidden="true" />
            <div>
              <small>{eyebrow ?? labels.onThisPage}</small>
              <strong>{title}</strong>
            </div>
          </div>
          {search('guide-content-search-desktop')}
          <div className="guide-toc-scroll">
            {filtered.length > 0 ? <GuideLinks headings={filtered} activeId={navigationActiveId} /> : <p className="guide-no-results">{labels.noSectionResults}</p>}
          </div>
        </div>
      </aside>
    </>
  )
}
