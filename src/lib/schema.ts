/**
 * schema.org JSON-LD.
 *
 * Every builder returns a plain object for `<JsonLd>` to serialise. Absolute
 * URLs throughout — a crawler resolves JSON-LD against nothing, so a
 * root-relative path here is simply lost.
 *
 * What each type is actually for:
 *   Organization   the knowledge-panel entity — name, logo, official accounts
 *   Course         the practitioner page, eligible for course rich results
 *   Event          upcoming sessions, eligible for event rich results
 *   BreadcrumbList the trail Google prints under a roadmap's search result
 *   Article        authorship and dates for a roadmap
 *   FAQPage        valid, though Google now shows FAQ rich results only for
 *                  health and government sites — kept for other consumers
 */

import { site, channels, contacts } from '~/site.config'
import type { Session } from '~/data/sessions'
import { course } from '~/data/mlops-practitioner'
import { sessionEndsAt, recordingUrl } from './sessions'
import type { RoadmapMeta } from './roadmaps'
import type { Lang } from './i18n'
import { asset } from './asset'

const CONTEXT = 'https://schema.org'

/**
 * Absolute URL for a root-relative path.
 *
 * Pages get the trailing slash the export uses; files must not, or the logo
 * resolves to `logo-full.png/` and every consumer 404s on it. A final segment
 * with an extension is the file case.
 */
export function abs(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const bare = path.replace(/^\/|\/$/g, '')
  const isFile = /\.[a-z0-9]{2,5}$/i.test(bare)
  const clean = bare === '' ? '/' : isFile ? `/${bare}` : `/${bare}/`
  return `${site.url}${asset(clean)}`
}

/** The community itself. Referenced by @id from every other node. */
export const ORG_ID = `${site.url}/#organization`

export function organizationSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    logo: abs('/logo-full.png'),
    image: abs('/logo-full.png'),
    description: site.description,
    email: contacts.email,
    sameAs: [channels.linkedin, channels.youtube, channels.github, channels.discord],
  }
}

/** Reference to the organization node rather than a second copy of it. */
const orgRef = { '@id': ORG_ID }

export function courseSchema(lang: Lang, description: string) {
  return {
    '@context': CONTEXT,
    '@type': 'Course',
    name: course.title,
    description,
    url: abs(lang === 'ar' ? '/ar/courses/mlops-practitioner' : '/courses/mlops-practitioner'),
    provider: orgRef,
    inLanguage: lang === 'ar' ? 'ar' : 'en',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      category: 'Free',
      availability: 'https://schema.org/InStock',
      url: course.enrollUrl,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      startDate: course.dates.start,
      endDate: course.dates.end,
      instructor: { '@type': 'Person', name: course.instructor.name },
    },
    // Shown on the page itself (the 4.9 next to the enrol button), which is
    // what makes it legitimate to mark up.
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: course.rating.score,
      ratingCount: course.rating.count,
      bestRating: 5,
    },
  }
}

/**
 * One session. Online-only, free, organised by the community.
 *
 * `posterUrl` is passed in because resolving it needs `fs` — see
 * sessions.server.ts — and this module stays importable from anywhere.
 */
export function eventSchema(s: Session, lang: Lang, posterUrl?: string) {
  const watch = recordingUrl(s)
  return {
    '@context': CONTEXT,
    '@type': 'Event',
    name: s.title,
    description: s.subtitle,
    startDate: s.startsAt,
    endDate: new Date(sessionEndsAt(s)).toISOString(),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'VirtualLocation',
      url: s.sessionPageUrl ?? s.registerUrl ?? watch ?? abs('/sessions'),
    },
    image: posterUrl ? [abs(posterUrl)] : [abs('/logo-full.png')],
    organizer: orgRef,
    performer: { '@type': 'Person', name: s.speaker },
    inLanguage: lang === 'ar' ? 'ar' : 'en',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: s.registerUrl ?? abs('/sessions'),
      validFrom: s.startsAt,
    },
  }
}

export function faqSchema(entries: { q: string; a: string }[]) {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: entries.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  }
}

/**
 * A roadmap as an article. `published` is the LinkedIn publication date from
 * the frontmatter; there is no separate modified date to report.
 */
export function roadmapArticleSchema(r: RoadmapMeta, lang: Lang, path: string) {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: r.title,
    description: `${r.tagline} — ${r.audience}`,
    url: abs(path),
    mainEntityOfPage: abs(path),
    image: [abs('/logo-full.png')],
    datePublished: r.published || undefined,
    author: { '@type': 'Person', name: contacts.founder.name, url: contacts.founder.linkedin },
    publisher: orgRef,
    inLanguage: lang === 'ar' ? 'ar' : 'en',
    isAccessibleForFree: true,
  }
}
