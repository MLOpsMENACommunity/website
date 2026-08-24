import type { Metadata } from 'next'
import PractitionerView from '@/views/PractitionerView'
import { t } from '@/lib/i18n'
import { courseAr } from '@/lib/content-i18n'

const copy = t('ar').practitionerPage
const summary = courseAr.summary

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: summary,
  alternates: {
    canonical: '/ar/courses/mlops-practitioner/',
    languages: {
      en: '/courses/mlops-practitioner/',
      ar: '/ar/courses/mlops-practitioner/',
    },
  },
  openGraph: { title: `${copy.metaTitle} · MLOps MENA`, description: summary },
}

export default function ArPractitionerPage() {
  return <PractitionerView lang="ar" />
}
