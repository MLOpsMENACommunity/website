/**
 * Per-page metadata, including the social card.
 *
 * Next inherits `openGraph` from the nearest layout that sets it, and it does
 * NOT fill `openGraph.title` in from the page's own `title`. Both edition
 * layouts set an explicit `openGraph.title`, so every page that did not
 * override it was shipping the homepage's card: the senior roadmap shared to
 * LinkedIn read "MLOps MENA Community — Free AI & MLOps education for MENA".
 *
 * Rather than repeat an `openGraph` block on 18 pages, each page calls this
 * with the title and description it already had.
 */

import type { Metadata } from 'next'
import { site } from '~/site.config'
import { asset } from './asset'
import type { Lang } from './i18n'

/**
 * The shared social card, 1200x670. Within a few pixels of the 1.91:1 that
 * LinkedIn, X and Slack crop to, so nothing important is trimmed.
 */
const card = {
  url: asset('/logo-full.png'),
  width: 1200,
  height: 670,
  alt: site.name,
}

const ogLocale: Record<Lang, string> = { en: 'en_US', ar: 'ar_EG' }

/**
 * Both editions of one page as root-relative paths with the trailing slash the
 * export uses. `path` comes in without the `/ar` prefix: '' is the homepage.
 */
function editions(path: string) {
  const en = path === '' || path === '/' ? '/' : `/${path.replace(/^\/|\/$/g, '')}/`
  return { en, ar: en === '/' ? '/ar/' : `/ar${en}` }
}

export function pageMetadata({
  lang,
  path,
  title,
  description,
}: {
  lang: Lang
  /** Without the `/ar` prefix — e.g. '/roadmaps' or '/roadmaps/devops-to-mlops'. */
  path: string
  /** The bare page title. The site suffix is appended for the card. */
  title: string
  description: string
}): Metadata {
  const languages = editions(path)
  const canonical = languages[lang]

  /**
   * `title.template` in the layout applies to `<title>` only, so the card
   * title has to carry the suffix itself to match what a reader sees in the tab.
   */
  const socialTitle = `${title} · ${site.shortName}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, 'x-default': languages.en },
    },
    openGraph: {
      type: 'website',
      siteName: site.name,
      locale: ogLocale[lang],
      url: canonical,
      title: socialTitle,
      description,
      images: [card],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [card],
    },
  }
}
