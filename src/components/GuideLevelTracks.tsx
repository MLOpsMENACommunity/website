'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Lightbulb, type LucideIcon } from 'lucide-react'
import GuideArticle from './GuideArticle'
import GuideNavigation from './GuideNavigation'
import type { GuideLevel, GuideLevelId, GuideTrackId } from '@/lib/student-guides.server'

type Labels = {
  levelNav: string
  trackNav: string
  levels: Record<GuideLevelId, string>
  tracks: Record<GuideTrackId, string>
  sectionsSuffix: string
  panePrevious: string
  paneNext: string
  onThisPage: string
  searchGuide: string
  searchGuidePlaceholder: string
  clearSearch: string
  noSectionResults: string
  readingProgress: string
  copied: string
}

const TRACKS: { id: GuideTrackId; Icon: LucideIcon }[] = [
  { id: 'detailed', Icon: BookOpen },
  { id: 'interview', Icon: GraduationCap },
  { id: 'tips', Icon: Lightbulb },
]

const TRACK_IDS = TRACKS.map((track) => track.id)

/* The nine panes also form one linear reading order — each level's three
   treatments, then the next level — which the footer steps through. */
type Coord = { level: GuideLevelId; track: GuideTrackId }

/* The sticky bar pins directly under the 4rem site header. */
const HEADER_OFFSET = 64

/* Arrow keys move between tabs and select as they go, which is the expected
   behaviour for a tablist whose panels are already rendered. */
function tabKeys<T extends string>(ids: readonly T[], current: T, select: (id: T) => void) {
  return (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    const index = ids.indexOf(current)
    const next =
      event.key === 'Home' ? 0
      : event.key === 'End' ? ids.length - 1
      : step ? (index + step + ids.length) % ids.length
      : -1
    if (next < 0) return
    event.preventDefault()
    select(ids[next])
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
}

export default function GuideLevelTracks({ levels, labels }: { levels: GuideLevel[]; labels: Labels }) {
  const [levelId, setLevelId] = useState<GuideLevelId>(levels[0].id)
  const [trackId, setTrackId] = useState<GuideTrackId>('detailed')
  const anchorRef = useRef<HTMLDivElement>(null)

  const levelIds = useMemo(() => levels.map((level) => level.id), [levels])
  const activeLevel = levels.find((level) => level.id === levelId) ?? levels[0]
  const activePane = activeLevel.panes[trackId]

  const order = useMemo<Coord[]>(
    () => levels.flatMap((level) => TRACK_IDS.map((track) => ({ level: level.id, track }))),
    [levels],
  )
  const position = order.findIndex((step) => step.level === levelId && step.track === trackId)
  const previous = position > 0 ? order[position - 1] : null
  const next = position < order.length - 1 ? order[position + 1] : null

  /* Every panel id and every heading id maps back to the pane that owns it, so a
     shared link opens on the right level and section. */
  const owners = useMemo(() => {
    const map = new Map<string, { level: GuideLevelId; track: GuideTrackId }>()
    for (const level of levels) {
      for (const track of TRACK_IDS) {
        const pane = level.panes[track]
        const owner = { level: level.id, track }
        map.set(pane.key, owner)
        for (const heading of pane.headings) map.set(heading.id, owner)
      }
    }
    return map
  }, [levels])

  const select = useCallback(
    (next: { level?: GuideLevelId; track?: GuideTrackId }) => {
      const level = next.level ?? levelId
      const track = next.track ?? trackId
      if (level === levelId && track === trackId) return

      /* Realigned before the swap rather than after it. The anchor sits above the
         switcher so its position never depends on which pane is open, and doing
         it now means the incoming pane is laid out at its final scroll offset —
         which is what its reveal wiring measures against. Only ever upwards, and
         instantly: this is a tab change, not a journey. */
      const anchor = anchorRef.current
      if (anchor) {
        const target = window.scrollY + anchor.getBoundingClientRect().top - HEADER_OFFSET
        if (window.scrollY > target + 1) window.scrollTo({ top: target, behavior: 'auto' })
      }

      setLevelId(level)
      setTrackId(track)
      const key = levels.find((candidate) => candidate.id === level)?.panes[track].key
      /* `replaceState` keeps the choice shareable without adding a history entry
         per click and without the jump a hash assignment would cause. */
      if (key) window.history.replaceState(null, '', `#${key}`)
    },
    [levelId, trackId, levels],
  )

  useEffect(() => {
    const applyHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      const owner = id ? owners.get(id) : undefined
      if (!owner || (owner.level === levelId && owner.track === trackId)) return
      setLevelId(owner.level)
      setTrackId(owner.track)
      /* The target is inside a pane that was hidden a moment ago, so wait for it
         to be laid out before scrolling to it. */
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
    }

    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [owners, levelId, trackId])

  return (
    <div className="gha-levels-shell">
      <div ref={anchorRef} aria-hidden="true" />
      <div className="gha-switcher">
        <div className="gha-switcher-inner mx-auto max-w-content px-5 sm:px-8">
          <div className="gha-group" role="tablist" aria-label={labels.levelNav} onKeyDown={tabKeys(levelIds, levelId, (id) => select({ level: id }))}>
            {levels.map((level) => {
              const active = level.id === levelId
              return (
                <button
                  key={level.id}
                  type="button"
                  id={`gha-level-${level.id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={level.panes[trackId].key}
                  tabIndex={active ? 0 : -1}
                  data-level={level.id}
                  className="gha-tab"
                  onClick={() => select({ level: level.id })}
                >
                  <i className="gha-dot" aria-hidden="true" />
                  {labels.levels[level.id]}
                  <em className="gha-tab-meta">
                    {level.sections} {labels.sectionsSuffix}
                  </em>
                </button>
              )
            })}
          </div>

          <span className="gha-switcher-rule" aria-hidden="true" />

          <div className="gha-group" role="tablist" aria-label={labels.trackNav} onKeyDown={tabKeys(TRACK_IDS, trackId, (id) => select({ track: id }))}>
            {TRACKS.map(({ id, Icon }) => {
              const active = id === trackId
              return (
                <button
                  key={id}
                  type="button"
                  id={`gha-track-${id}`}
                  role="tab"
                  aria-selected={active}
                  aria-controls={activeLevel.panes[id].key}
                  tabIndex={active ? 0 : -1}
                  className="gha-tab"
                  onClick={() => select({ track: id })}
                >
                  <Icon aria-hidden="true" />
                  {labels.tracks[id]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="guide-page-layout gha-guide-page mx-auto max-w-content px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:py-14">
        <GuideNavigation
          key={activePane.key}
          headings={activePane.headings}
          labels={labels}
          eyebrow={labels.levels[levelId]}
          title={labels.tracks[trackId]}
          scopeId={activePane.key}
        />
        {/* All nine panes ship in the HTML so every section is indexable and a
            switch costs nothing; the inactive ones are simply not displayed. */}
        <div className="min-w-0">
          {levels.map((level) =>
            TRACK_IDS.map((track) => {
              const pane = level.panes[track]
              const active = level.id === levelId && track === trackId
              return (
                <div
                  key={pane.key}
                  id={pane.key}
                  role="tabpanel"
                  aria-labelledby={`gha-level-${level.id} gha-track-${track}`}
                  hidden={!active}
                  className="gha-pane"
                >
                  <GuideArticle html={pane.html} copiedLabel={labels.copied} active={active} />
                </div>
              )
            }),
          )}

          <nav className="gha-pane-steps" aria-label={labels.paneNext}>
            {[
              { coord: previous, label: labels.panePrevious, back: true },
              { coord: next, label: labels.paneNext, back: false },
            ].map(({ coord, label, back }) =>
              coord ? (
                <button
                  key={label}
                  type="button"
                  data-back={back}
                  onClick={() => select(coord)}
                >
                  {back && <ArrowLeft className="rtl:-scale-x-100" aria-hidden="true" />}
                  <span>
                    <small>{label}</small>
                    <strong>
                      {labels.levels[coord.level]} · {labels.tracks[coord.track]}
                    </strong>
                  </span>
                  {!back && <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />}
                </button>
              ) : (
                <span key={label} />
              ),
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
