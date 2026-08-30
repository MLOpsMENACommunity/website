import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

export type GuideHeading = {
  id: string
  title: string
  level: 2 | 3
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&rarr;/g, '→')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getGitHubActionsGuideContent() {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'public', 'guides', 'github-actions-guide.html'),
    'utf8',
  )
  const main = source.match(/<main>([\s\S]*?)<\/main>/i)?.[1]

  if (!main) throw new Error('The GitHub Actions guide is missing its main content.')

  let subsectionIndex = 0
  const html = main
    .replace(/<h1>[\s\S]*?<\/h1>/i, '')
    .replace(/<footer>[\s\S]*?<\/footer>/i, '')
    .replace(/<button class="copy-btn">/g, '<button type="button" class="copy-btn">')
    .replace(/ target="_blank"/g, ' target="_blank" rel="noreferrer"')
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, (_, title: string) => {
      subsectionIndex += 1
      return `<h3 id="subsection-${subsectionIndex}">${title}</h3>`
    })
    .trim()

  const headings: GuideHeading[] = []
  for (const match of html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/gi)) {
    headings.push({ id: match[1], title: plainText(match[2]), level: 2 })
  }
  for (const match of html.matchAll(/<h3 id="([^"]+)">([\s\S]*?)<\/h3>/gi)) {
    headings.push({ id: match[1], title: plainText(match[2]), level: 3 })
  }

  headings.sort((a, b) => html.indexOf(`id="${a.id}"`) - html.indexOf(`id="${b.id}"`))

  return { html, headings }
}
