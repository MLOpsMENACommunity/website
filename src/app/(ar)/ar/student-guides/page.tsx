import type { Metadata } from 'next'
import StudentGuidesView from '@/views/StudentGuidesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').studentGuidesPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/student-guides',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArStudentGuidesPage() {
  return <StudentGuidesView lang="ar" />
}
