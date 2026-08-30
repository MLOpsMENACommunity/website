import type { Metadata } from 'next'
import StudentGuidesView from '@/views/StudentGuidesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').studentGuidesPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/student-guides',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnStudentGuidesPage() {
  return <StudentGuidesView lang="en" />
}
