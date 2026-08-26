import type { Metadata } from 'next'
import CoursesView from '@/views/CoursesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').coursesPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/courses',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnCoursesPage() {
  return <CoursesView lang="en" />
}
