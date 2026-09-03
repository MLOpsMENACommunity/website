'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import { ArrowRight, Database, GitPullRequest, Layers, LineChart, Network, Package, Rocket, Search, Server, Workflow, X } from 'lucide-react'
import type { StudentGuide } from '~/data/student-guides'
import ToolLogo, { type ToolSlug } from './ToolLogo'
import { localeHref, type Lang } from '@/lib/i18n'

type Labels = {
  searchLabel: string
  searchPlaceholder: string
  clearSearch: string
  noResultsTitle: string
  noResultsLead: string
  openGuide: string
  englishGuide: string
  statSections: string
}

export default function StudentGuidesCatalog({
  guides,
  lang,
  labels,
  sectionsBySlug,
}: {
  guides: StudentGuide[]
  lang: Lang
  labels: Labels
  sectionsBySlug: Record<string, number>
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
      <div className="guides-search enter relative mx-auto mb-8 max-w-2xl" style={{ '--enter-delay': '440ms' } as React.CSSProperties}>
        <label htmlFor="guide-search" className="sr-only">{labels.searchLabel}</label>
        <Search className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-faint transition-colors" />
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
        <div className="card enter flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Search className="h-7 w-7 text-cyan-400" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-fg">{labels.noResultsTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{labels.noResultsLead}</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((guide, index) => {
            const isGitHub = guide.slug === 'github-actions'
            const isDocker = guide.slug === 'docker'
            const isDvc = guide.slug === 'dvc'
            const isAirflow = guide.slug === 'airflow'
            const isClearML = guide.slug === 'clearml'
            const isMlflow = guide.slug === 'mlflow'
            const sections = sectionsBySlug[guide.slug]
            return (
              <Link
              key={guide.slug}
              href={localeHref(lang, `/student-guides/${guide.slug}`)}
              style={{ '--enter-delay': `${550 + index * 120}ms` } as React.CSSProperties}
              className={`student-guide-card card card-hover group enter flex min-h-80 flex-col overflow-hidden p-6 sm:p-8 ${
                isGitHub ? 'github-actions-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isDocker ? 'docker-guide-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isDvc ? 'dvc-guide-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isAirflow ? 'airflow-guide-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isClearML ? 'clearml-guide-card md:col-span-2 lg:col-span-3' : ''
              } ${
                isMlflow ? 'mlflow-guide-card md:col-span-2 lg:col-span-3' : ''
              }`}
            >
              {isGitHub && (
                <div className="github-card-background" aria-hidden="true">
                  <span className="github-flow-node node-one"><ToolLogo slug="github-actions" /></span>
                  <span className="github-flow-node node-two"><Workflow /></span>
                  <span className="github-flow-node node-three"><GitPullRequest /></span>
                  <i className="github-flow-line line-one" />
                  <i className="github-flow-line line-two" />
                </div>
              )}
              {isDocker && (
                <div className="docker-card-background" aria-hidden="true">
                  <div className="docker-container-stack"><i /><i /><i /><i /><i /><i /></div>
                  <span className="docker-card-node node-one"><ToolLogo slug="docker" /></span>
                  <span className="docker-card-node node-two"><Network /></span>
                  <span className="docker-card-node node-three"><Database /></span>
                  <i className="docker-card-wave wave-one" />
                  <i className="docker-card-wave wave-two" />
                </div>
              )}
              {isDvc && (
                <div className="dvc-card-background" aria-hidden="true">
                  <div className="dvc-commit-graph"><i /><i /><i /><i /><i /></div>
                  <span className="dvc-card-node node-one"><ToolLogo slug="dvc" /></span>
                  <span className="dvc-card-node node-two"><Layers /></span>
                  <span className="dvc-card-node node-three"><Database /></span>
                  <i className="dvc-card-line line-one" />
                  <i className="dvc-card-line line-two" />
                </div>
              )}
              {isAirflow && (
                <div className="airflow-card-background" aria-hidden="true">
                  <div className="airflow-card-graph"><i /><i /><i /><i /><i /><i /></div>
                  <span className="airflow-card-node node-one"><ToolLogo slug="airflow" /></span>
                  <span className="airflow-card-node node-two"><Workflow /></span>
                  <span className="airflow-card-node node-three"><Layers /></span>
                  <i className="airflow-card-line line-one" />
                  <i className="airflow-card-line line-two" />
                </div>
              )}
              {isClearML && (
                <div className="clearml-card-background" aria-hidden="true">
                  <div className="clearml-card-trace"><i /><i /><i /><i /><i /><i /><i /></div>
                  <span className="clearml-card-node node-one"><ToolLogo slug="clearml" /></span>
                  <span className="clearml-card-node node-two"><Server /></span>
                  <span className="clearml-card-node node-three"><LineChart /></span>
                  <i className="clearml-card-line line-one" />
                  <i className="clearml-card-line line-two" />
                </div>
              )}
              {isMlflow && (
                <div className="mlflow-card-background" aria-hidden="true">
                  <div className="mlflow-card-curve"><i /><i /><i /><i /><i /><i /><i /><i /></div>
                  <span className="mlflow-card-node node-one"><ToolLogo slug="mlflow" /></span>
                  <span className="mlflow-card-node node-two"><Package /></span>
                  <span className="mlflow-card-node node-three"><Rocket /></span>
                  <i className="mlflow-card-line line-one" />
                  <i className="mlflow-card-line line-two" />
                </div>
              )}
              <div className="relative flex h-full flex-col md:max-w-[68%]">
                <div className="flex items-start justify-between gap-4">
                  <span className={`guide-card-logo ${isDocker ? 'docker-card-icon' : isDvc ? 'dvc-card-icon' : isAirflow ? 'airflow-card-icon' : isClearML ? 'clearml-card-icon' : isMlflow ? 'mlflow-card-icon' : 'github-card-icon'}`}>
                    <ToolLogo slug={guide.slug as ToolSlug} />
                  </span>
                  <span className="chip">{guide.category}</span>
                </div>
                <h2 className="mt-6 text-2xl font-semibold leading-snug text-fg sm:text-3xl">{guide.title}</h2>
                <p className="mt-3 max-w-2xl flex-1 text-sm leading-relaxed text-muted sm:text-base">{guide.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {sections > 0 && (
                    <span className="chip guide-section-chip !px-2.5 !py-0.5 text-[10px]">
                      {sections} {labels.statSections}
                    </span>
                  )}
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
