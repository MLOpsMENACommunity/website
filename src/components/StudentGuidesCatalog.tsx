'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import { ArrowRight, Box, Database, Github, GitPullRequest, Network, Search, Workflow, X } from 'lucide-react'
import type { StudentGuide } from '~/data/student-guides'
import { localeHref, type Lang } from '@/lib/i18n'

type Labels = {
  searchLabel: string
  searchPlaceholder: string
  clearSearch: string
  noResultsTitle: string
  noResultsLead: string
  openGuide: string
  englishGuide: string
}

export default function StudentGuidesCatalog({
  guides,
  lang,
  labels,
}: {
  guides: StudentGuide[]
  lang: Lang
  labels: Labels
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase())
  const filteredGuides = guides.filter((guide) =>
    [guide.title, guide.description, guide.category, ...guide.tags]
      .join(' ')
      .toLocaleLowerCase()
      .includes(deferredQuery),
  )

  return (
    <>
      <div className="relative mx-auto mb-8 max-w-2xl">
        <label htmlFor="guide-search" className="sr-only">{labels.searchLabel}</label>
        <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input
          id="guide-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-14 w-full rounded-2xl border border-line bg-surface ps-14 pe-12 text-sm text-fg shadow-sm outline-none transition placeholder:text-faint focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={labels.clearSearch}
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-faint transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filteredGuides.length === 0 ? (
        <div className="card flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Search className="h-7 w-7 text-cyan-400" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-fg">{labels.noResultsTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{labels.noResultsLead}</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((guide) => {
            const isGitHub = guide.slug === 'github-actions'
            const isDocker = guide.slug === 'docker'
            const Icon = isDocker ? Box : Github
            return (
              <Link
              key={guide.slug}
              href={localeHref(lang, `/student-guides/${guide.slug}`)}
              className={`student-guide-card card card-hover group flex min-h-80 flex-col overflow-hidden p-6 sm:p-8 ${
                isGitHub ? 'github-actions-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isDocker ? 'docker-guide-card md:col-span-2 lg:col-span-3' : ''
              }`}
            >
              {isGitHub && (
                <div className="github-card-background" aria-hidden="true">
                  <span className="github-flow-node node-one"><Github /></span>
                  <span className="github-flow-node node-two"><Workflow /></span>
                  <span className="github-flow-node node-three"><GitPullRequest /></span>
                  <i className="github-flow-line line-one" />
                  <i className="github-flow-line line-two" />
                </div>
              )}
              {isDocker && (
                <div className="docker-card-background" aria-hidden="true">
                  <div className="docker-container-stack"><i /><i /><i /><i /><i /><i /></div>
                  <span className="docker-card-node node-one"><Box /></span>
                  <span className="docker-card-node node-two"><Network /></span>
                  <span className="docker-card-node node-three"><Database /></span>
                  <i className="docker-card-wave wave-one" />
                  <i className="docker-card-wave wave-two" />
                </div>
              )}
              <div className="relative flex h-full flex-col md:max-w-[68%]">
                <div className="flex items-start justify-between gap-4">
                  <span className={`${isDocker ? 'docker-card-icon' : 'github-card-icon'} flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-400`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="chip">{guide.category}</span>
                </div>
                <h2 className="mt-6 text-2xl font-semibold leading-snug text-fg sm:text-3xl">{guide.title}</h2>
                <p className="mt-3 max-w-2xl flex-1 text-sm leading-relaxed text-muted sm:text-base">{guide.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {guide.tags.map((tag) => <span key={tag} className="chip !px-2.5 !py-0.5 text-[10px]">{tag}</span>)}
                  {lang === 'ar' && <span className="chip !px-2.5 !py-0.5 text-[10px]">{labels.englishGuide}</span>}
                </div>
                <span className="mt-5 inline-flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-cyan-400">
                  {labels.openGuide}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
