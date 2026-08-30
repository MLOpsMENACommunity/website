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

/* Every long-form guide lives in `content/student-guides/<slug>.md` as plain
   markdown plus the presentational blocks documented in `globals.css`
   (`.callout`, `.cards`, `.flow`, `.guide-steps`, `.guide-compare`,
   `.guide-timeline`, `.guide-stat-strip`). The reading chrome that is identical
   for every guide — the learning path card and the phase dividers — is
   described here instead of being repeated in prose. */
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

type GuideDefinition = {
  slug: string
  learningPath: {
    title: string
    intro: string
    stages: LearningStage[]
  }
  phases: GuidePhase[]
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

function learningPathHtml({ title, intro, stages }: GuideDefinition['learningPath']) {
  const items = stages
    .map((stage) => `<li><b>${stage.label}</b><span>${stage.range}</span><small>${stage.detail}</small></li>`)
    .join('')
  return `<div class="guide-learning-path"><span class="guide-path-eyebrow">Learning path</span><h2>${title}</h2><p>${intro}</p><ol>${items}</ol></div>`
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

async function renderStudentGuide(definition: GuideDefinition) {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), 'content', 'student-guides', `${definition.slug}.md`),
    'utf8',
  )

  let html = String(
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

  html = addCodeWindows(html)
  html = normalizeNumberedHeadings(html)
  html = learningPathHtml(definition.learningPath) + addPhaseMarkers(html, definition.phases)

  return { html, headings: headingsFromHtml(html) }
}

const githubActionsGuide: GuideDefinition = {
  slug: 'github-actions',
  learningPath: {
    title: 'From first workflow to production delivery',
    intro:
      'Read the guide in order once, then use the navigation and search as a practical reference while you build real pipelines.',
    stages: [
      { label: 'Foundations', range: '01-07', detail: 'Concepts, your first workflow, events, jobs, and steps' },
      { label: 'Real pipelines', range: '08-14', detail: 'Actions, runners, expressions, secrets, caching, and artifacts' },
      { label: 'Advanced automation', range: '15-22', detail: 'Matrices, services, reuse, environments, security, and Docker' },
      { label: 'Production', range: '23-28', detail: 'ML pipelines, debugging, full examples, and a cheat sheet' },
    ],
  },
  phases: [
    { at: '01', label: 'Phase 1', title: 'Foundations', detail: 'Understand the platform and ship your first green run' },
    { at: '08', label: 'Phase 2', title: 'Real pipelines', detail: 'Compose actions, data, and caching into useful CI' },
    { at: '15', label: 'Phase 3', title: 'Advanced automation', detail: 'Scale, reuse, and secure your workflows' },
    { at: '23', label: 'Phase 4', title: 'Production delivery', detail: 'Operate pipelines you can trust and debug' },
  ],
}

const dockerGuide: GuideDefinition = {
  slug: 'docker',
  learningPath: {
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

export function getGitHubActionsGuideContent() {
  return renderStudentGuide(githubActionsGuide)
}

export function getDockerGuideContent() {
  return renderStudentGuide(dockerGuide)
}
