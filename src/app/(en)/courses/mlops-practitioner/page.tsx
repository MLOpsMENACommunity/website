import type { Metadata } from 'next'
import PractitionerView from '@/views/PractitionerView'
import { course } from '~/data/mlops-practitioner'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').practitionerPage
const summary = course.summary

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/courses/mlops-practitioner',
  title: copy.metaTitle,
  description: summary,
})

export default function EnPractitionerPage() {
  return <PractitionerView lang="en" />
}
