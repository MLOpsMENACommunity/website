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
}: {
  headings: GuideHeading[]
  labels: Labels
  title: string
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [progress, setProgress] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const filtered = query.trim()
    ? headings.filter((heading) => heading.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    : headings.filter((heading) => heading.level === 2)
  const activeHeading = headings.find((heading) => heading.id === activeId)
  const activeIndex = headings.findIndex((heading) => heading.id === activeId)
  const activeSection = [...headings.slice(0, activeIndex + 1)].reverse().find((heading) => heading.level === 2)
  const navigationActiveId = query.trim() ? activeId : activeSection?.id ?? activeId

  useEffect(() => {
    const update = () => {
      const elements = headings
        .map((heading) => document.getElementById(heading.id))
        .filter((element): element is HTMLElement => Boolean(element))
      const current = [...elements].reverse().find((element) => element.getBoundingClientRect().top <= 150) ?? elements[0]
      if (current) setActiveId(current.id)

      const article = document.querySelector<HTMLElement>('.student-guide-prose')
      if (!article) return
      const start = article.offsetTop - 120
      const max = article.offsetHeight - window.innerHeight + 180
      setProgress(Math.max(0, Math.min(100, ((window.scrollY - start) / max) * 100)))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [headings])

  useEffect(() => {
    document.querySelectorAll('.student-guide-prose h2, .student-guide-prose h3').forEach((heading) => {
      heading.toggleAttribute('data-current', heading.id === activeId)
    })
  }, [activeId])

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
            <small>{labels.onThisPage}</small>
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
              <small>{labels.onThisPage}</small>
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
