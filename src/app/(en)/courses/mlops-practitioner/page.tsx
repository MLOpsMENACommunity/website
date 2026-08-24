import type { Metadata } from 'next'
import PractitionerView from '@/views/PractitionerView'
import { course } from '~/data/mlops-practitioner'
import { t } from '@/lib/i18n'

const copy = t('en').practitionerPage
const summary = course.summary

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: summary,
  alternates: {
    canonical: '/courses/mlops-practitioner/',
    languages: {
      en: '/courses/mlops-practitioner/',
      ar: '/ar/courses/mlops-practitioner/',
    },
  },
  openGraph: { title: `${copy.metaTitle} · MLOps MENA`, description: summary },
}

export default function EnPractitionerPage() {
  return <PractitionerView lang="en" />
}
