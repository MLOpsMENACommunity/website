import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'

export type GuideHeading = {
  id: string
  title: string
  level: 2 | 3
}

/* Guides are plain markdown plus the presentational blocks documented in
   `globals.css` (`.callout`, `.cards`, `.flow`, `.guide-steps`, `.guide-compare`,
   `.guide-timeline`, `.guide-stat-strip`). A single-document guide lives at
   `content/student-guides/<slug>.md`; a levelled one is a directory of panes.
   Reading chrome that is identical for every guide — the learning path card and
   the phase dividers — is described here rather than repeated in prose. */
type LearningStage = {
  label: string
  range: string
  detail: string
}

type GuidePhase = {
  /* The two-digit section number this phase opens, e.g. '08'. */
  at: string
  label: string
  title: string
  detail: string
}

/* The card that opens a single-document guide: an eyebrow, a promise, and the
   stages it is made of. */
type GuideBrief = {
  eyebrow: string
  title: string
  intro: string
  stages: LearningStage[]
}

type GuideDefinition = {
  slug: string
  learningPath: GuideBrief
  phases: GuidePhase[]
}

/* ---- Levelled guides ----
   Read as a 3 × 3 grid: pick an experience level, then pick how you want to read
   it. Each of the nine panes is its own document under
   `content/student-guides/<slug>/<level>-<track>.md`, written for that
   combination rather than sliced out of a shared one. */
export type GuideLevelId = 'beginner' | 'mid' | 'senior'
export type GuideTrackId = 'detailed' | 'interview' | 'tips'

const TRACK_IDS: GuideTrackId[] = ['detailed', 'interview', 'tips']

export type GuidePane = {
  /* Doubles as the panel's DOM id and its location hash, so a level and section
     choice is linkable and survives a reload. */
  key: string
  html: string
  headings: GuideHeading[]
}

export type GuideLevel = {
  id: GuideLevelId
  /* Headings across all three of this level's panes. */
  sections: number
  panes: Record<GuideTrackId, GuidePane>
}

type CodeNode = {
  lang?: string | null
  meta?: string | null
  value?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&rarr;/g, '→')
    .replace(/\s+/g, ' ')
    .trim()
}

function headingsFromHtml(html: string) {
  const headings: GuideHeading[] = []
  for (const match of html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/gi)) {
    headings.push({
      id: match[2],
      title: plainText(match[3]),
      level: Number(match[1]) as 2 | 3,
    })
  }
  return headings
}

/* `## 01 Workflows` becomes a badge plus a title so the number can be styled
   separately and reused by the contents navigation. */
function normalizeNumberedHeadings(html: string) {
  return html.replace(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/gi, (heading, id: string, content: string) => {
    const title = plainText(content)
    const numbered = title.match(/^(\d{2})\s+(.+)$/)
    if (!numbered) return heading
    return `<h2 id="${id}"><span class="num">${numbered[1]}</span><span class="heading-title">${escapeHtml(numbered[2])}</span></h2>`
  })
}

/* Replaces the default `code` handler so a fence can carry a file name:

       ```yaml .github/workflows/ci.yml

   The name lands on `<pre data-file="…">` and becomes the code window label. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function codeHandler(_state: unknown, node: CodeNode): any {
  const language = node.lang?.match(/^[^ \t]+/)?.[0]
  const file = node.meta?.trim()
  return {
    type: 'element',
    tagName: 'pre',
    properties: file ? { 'data-file': file } : {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: language ? { className: [`language-${language}`] } : {},
        children: [{ type: 'text', value: node.value ? `${node.value}\n` : '' }],
      },
    ],
  }
}

/* Every code block gets terminal chrome and a copy button. The label is the
   fence's file name when present, otherwise the language, otherwise a count. */
function addCodeWindows(html: string) {
  let exampleIndex = 0
  return html.replace(
    /<pre(?: data-file="([^"]*)")?><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/gi,
    (_match, file: string | undefined, language: string | undefined, code: string) => {
      exampleIndex += 1
      const label = file || (language ? language.toUpperCase() : `Example ${exampleIndex}`)
      return `<div class="code-window"><div class="code-head"><div class="dots"><i></i><i></i><i></i></div><span class="file">${label}</span><button type="button" class="copy-btn">Copy</button></div><pre><code>${code}</code></pre></div>`
    },
  )
}

function briefHtml({ eyebrow, title, intro, stages }: GuideBrief) {
  const items = stages
    .map((stage) => `<li><b>${stage.label}</b><span>${stage.range}</span><small>${stage.detail}</small></li>`)
    .join('')
  return `<div class="guide-learning-path"><span class="guide-path-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${intro}</p><ol>${items}</ol></div>`
}

function statStripHtml(facts: { value: string; label: string }[]) {
  const items = facts.map((fact) => `<div class="guide-stat"><b>${fact.value}</b><span>${fact.label}</span></div>`).join('')
  /* The count drives the column layout, so a two-fact strip fills its row
     instead of leaving two empty cells. */
  return `<div class="guide-stat-strip" data-count="${facts.length}">${items}</div>`
}

/* Phase dividers are keyed by section number rather than by slug so renaming a
   heading never silently drops its divider. */
function addPhaseMarkers(html: string, phases: GuidePhase[]) {
  const byNumber = new Map(phases.map((phase) => [phase.at, phase]))
  return html.replace(/<h2 id="[^"]+"><span class="num">(\d{2})<\/span>/gi, (heading, number: string) => {
    const phase = byNumber.get(number)
    if (!phase) return heading
    return `<div class="guide-phase-marker"><span>${phase.label}</span><strong>${phase.title}</strong><small>${phase.detail}</small></div>${heading}`
  })
}

/* `rehype-slug` only guarantees unique ids inside one document, so panes built
   from separate files need a namespace of their own. The detailed panes come out
   of a single document and are deliberately left unprefixed, which keeps every
   `#01-introduction-to-github-actions` style link that already exists working. */
function prefixHeadingIds(html: string, prefix: string) {
  return html.replace(/<h([23]) id="([^"]+)"/gi, (_match, level: string, id: string) => `<h${level} id="${prefix}${id}"`)
}

function readGuideMarkdown(...segments: string[]) {
  return fs.readFileSync(path.join(process.cwd(), 'content', 'student-guides', ...segments), 'utf8')
}

async function renderMarkdown(markdown: string) {
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      /* The guides embed the presentational blocks as raw HTML, so it has to
         survive the markdown pass. The content is repository-authored, never
         user input. */
      .use(remarkRehype, { allowDangerousHtml: true, handlers: { code: codeHandler } })
      .use(rehypeSlug)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(markdown),
  )

  return normalizeNumberedHeadings(addCodeWindows(html))
}

async function renderStudentGuide(definition: GuideDefinition) {
  const html = await renderMarkdown(readGuideMarkdown(`${definition.slug}.md`))
  const withChrome = briefHtml(definition.learningPath) + addPhaseMarkers(html, definition.phases)

  return { html: withChrome, headings: headingsFromHtml(withChrome) }
}

/* The GitHub Actions guide is written per level. Nothing is hidden from anyone —
   the level only decides which of the three parallel treatments you read. */
const githubActionsLevels: GuideLevelId[] = ['beginner', 'mid', 'senior']

const dockerGuide: GuideDefinition = {
  slug: 'docker',
  learningPath: {
    eyebrow: 'Learning path',
    title: 'From first container to production',
    intro: 'Follow the guide in order once, then use the navigation and search as a practical reference.',
    stages: [
      { label: 'Core', range: '01-07', detail: 'Images, containers, Dockerfiles, ports, and logs' },
      { label: 'Application stacks', range: '08-12', detail: 'Volumes, networks, Compose, configuration, and registries' },
      { label: 'Advanced', range: '13-19', detail: 'Multi-stage builds, health, security, debugging, and optimization' },
      { label: 'Production', range: '20-26', detail: 'Runtime controls, ML images, orchestration, and troubleshooting' },
    ],
  },
  phases: [
    { at: '01', label: 'Phase 1', title: 'Core foundations', detail: 'Understand and operate individual containers' },
    { at: '08', label: 'Phase 2', title: 'Application stacks', detail: 'Connect services and preserve application state' },
    { at: '13', label: 'Phase 3', title: 'Advanced Docker', detail: 'Build smaller, safer, observable images' },
    { at: '20', label: 'Phase 4', title: 'Production delivery', detail: 'Ship and operate reliable container workloads' },
  ],
}

const GITHUB_ACTIONS_SLUG = 'github-actions'

function githubActionsPaneFiles() {
  return githubActionsLevels.flatMap((level) => TRACK_IDS.map((track) => `${level}-${track}.md`))
}

function topLevelSections(headings: GuideHeading[]) {
  return headings.filter((heading) => heading.level === 2).length
}

async function guidePane(level: GuideLevelId, track: GuideTrackId): Promise<GuidePane> {
  const key = `${level}-${track}`
  const rendered = await renderMarkdown(readGuideMarkdown(GITHUB_ACTIONS_SLUG, `${key}.md`))
  /* Every pane is its own document, so `rehype-slug` only guarantees uniqueness
     within one. The pane key namespaces them and keeps each anchor linkable. */
  const html = prefixHeadingIds(rendered, `${key}-`)
  return { key, html, headings: headingsFromHtml(html) }
}

export async function getGitHubActionsGuideLevels(): Promise<GuideLevel[]> {
  return Promise.all(
    githubActionsLevels.map(async (id) => {
      const [detailed, interview, tips] = await Promise.all(TRACK_IDS.map((track) => guidePane(id, track)))

      /* The detailed pane opens on its own two numbers, both counted from the
         pane itself so they cannot drift from the writing. */
      const facts = [
        { value: String(topLevelSections(detailed.headings)), label: 'sections' },
        { value: String(detailed.html.match(/class="code-window"/g)?.length ?? 0), label: 'examples' },
      ]

      return {
        id,
        sections: [detailed, interview, tips].reduce((total, pane) => total + topLevelSections(pane.headings), 0),
        panes: {
          detailed: { ...detailed, html: statStripHtml(facts) + detailed.html },
          interview,
          tips,
        },
      }
    }),
  )
}

export function getDockerGuideContent() {
  return renderStudentGuide(dockerGuide)
}

/* Counted from the markdown rather than written down anywhere, so the figure on a
   catalogue card cannot drift from the guide itself. */
export function getStudentGuideSectionCounts(): Record<string, number> {
  const count = (markdown: string) => markdown.match(/^## /gm)?.length ?? 0

  return {
    [GITHUB_ACTIONS_SLUG]: githubActionsPaneFiles().reduce(
      (total, file) => total + count(readGuideMarkdown(GITHUB_ACTIONS_SLUG, file)),
      0,
    ),
    docker: count(readGuideMarkdown('docker.md')),
  }
}
