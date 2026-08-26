import type { Metadata } from 'next'
import PractitionerView from '@/views/PractitionerView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { courseAr } from '@/lib/content-i18n'

const copy = t('ar').practitionerPage
const summary = courseAr.summary

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/courses/mlops-practitioner',
  title: copy.metaTitle,
  description: summary,
})

export default function ArPractitionerPage() {
  return <PractitionerView lang="ar" />
}
