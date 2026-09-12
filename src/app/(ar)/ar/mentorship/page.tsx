import type { Metadata } from 'next'
import MovedView from '@/views/MovedView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').movedPage

/**
 * Mentorship was folded into the services page, and that page is gone. The
 * route stays so the links we have already published keep resolving — it now
 * sends people to sessions, the nearest live thing — and it is kept out of the
 * index with its canonical pointing at the destination.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    lang: 'ar',
    path: '/sessions',
    title: copy.metaTitle,
    description: copy.metaDesc,
  }),
  robots: { index: false, follow: true },
}

export default function ArMentorshipPage() {
  return <MovedView lang="ar" to="/sessions" />
}
