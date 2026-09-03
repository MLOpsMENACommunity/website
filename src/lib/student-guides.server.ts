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

/* ---- Levelled guides ----
   A guide is read as a 3 × 3 grid: pick an experience level, then pick how you
   want to read it. Each of the nine panes is its own markdown document at
   `content/student-guides/<slug>/<level>-<track>.md`, written for that
   combination, plus the presentational blocks documented in `globals.css`
   (`.callout`, `.cards`, `.flow`, `.guide-steps`, `.guide-compare`,
   `.guide-timeline`). */
export type GuideLevelId = 'beginner' | 'mid' | 'senior'
export type GuideTrackId = 'detailed' | 'interview' | 'tips'

const LEVEL_IDS: GuideLevelId[] = ['beginner', 'mid', 'senior']
const TRACK_IDS: GuideTrackId[] = ['detailed', 'interview', 'tips']

/* Every guide on the site is levelled. Listed here so the catalogue counts and
   the sitemap cannot drift from what actually exists on disk. */
export const GUIDE_SLUGS = ['docker', 'github-actions', 'dvc', 'airflow'] as const

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

function statStripHtml(facts: { value: string; label: string }[]) {
  const items = facts.map((fact) => `<div class="guide-stat"><b>${fact.value}</b><span>${fact.label}</span></div>`).join('')
  /* The count drives the column layout, so a two-fact strip fills its row
     instead of leaving empty cells. */
  return `<div class="guide-stat-strip" data-count="${facts.length}">${items}</div>`
}

/* `rehype-slug` only guarantees unique ids inside one document, and a levelled
   guide puts nine documents on one page. The pane key namespaces them so every
   heading stays individually linkable. */
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

  return addCodeWindows(html)
}

function topLevelSections(headings: GuideHeading[]) {
  return headings.filter((heading) => heading.level === 2).length
}

function paneFiles() {
  return LEVEL_IDS.flatMap((level) => TRACK_IDS.map((track) => `${level}-${track}.md`))
}

async function guidePane(slug: string, level: GuideLevelId, track: GuideTrackId): Promise<GuidePane> {
  const key = `${level}-${track}`
  const rendered = await renderMarkdown(readGuideMarkdown(slug, `${key}.md`))
  const html = prefixHeadingIds(rendered, `${key}-`)
  return { key, html, headings: headingsFromHtml(html) }
}

export async function getGuideLevels(slug: string): Promise<GuideLevel[]> {
  return Promise.all(
    LEVEL_IDS.map(async (id) => {
      const [detailed, interview, tips] = await Promise.all(
        TRACK_IDS.map((track) => guidePane(slug, id, track)),
      )

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

/* Counted from the markdown rather than written down anywhere, so the figure on a
   catalogue card cannot drift from the guide itself. */
export function getStudentGuideSectionCounts(): Record<string, number> {
  const count = (markdown: string) => markdown.match(/^## /gm)?.length ?? 0

  return Object.fromEntries(
    GUIDE_SLUGS.map((slug) => [
      slug,
      paneFiles().reduce((total, file) => total + count(readGuideMarkdown(slug, file)), 0),
    ]),
  )
}
