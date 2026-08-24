import type { Metadata } from 'next'
import CoursesView from '@/views/CoursesView'
import { t } from '@/lib/i18n'

const copy = t('en').coursesPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/courses/', languages: { en: '/courses/', ar: '/ar/courses/' } },
}

export default function EnCoursesPage() {
  return <CoursesView lang="en" />
}
