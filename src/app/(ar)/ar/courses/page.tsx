import type { Metadata } from 'next'
import CoursesView from '@/views/CoursesView'
import { t } from '@/lib/i18n'

const copy = t('ar').coursesPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/ar/courses/', languages: { en: '/courses/', ar: '/ar/courses/' } },
}

export default function ArCoursesPage() {
  return <CoursesView lang="ar" />
}
