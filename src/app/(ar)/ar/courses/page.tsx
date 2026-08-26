import type { Metadata } from 'next'
import CoursesView from '@/views/CoursesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').coursesPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/courses',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArCoursesPage() {
  return <CoursesView lang="ar" />
}
