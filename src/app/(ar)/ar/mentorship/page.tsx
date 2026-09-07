import type { Metadata } from 'next'
import MovedView from '@/views/MovedView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').movedPage

/**
 * Mentorship folded into the services page. This route stays so the links we
 * have already published keep resolving, but it is kept out of the index and
 * points its canonical at the page that replaced it.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    lang: 'ar',
    path: '/services',
    title: copy.metaTitle,
    description: copy.metaDesc,
  }),
  robots: { index: false, follow: true },
}

export default function ArMentorshipPage() {
  return <MovedView lang="ar" to="/services" />
}
