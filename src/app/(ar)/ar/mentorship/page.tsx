import type { Metadata } from 'next'
import MentorshipView from '@/views/MentorshipView'
import { t } from '@/lib/i18n'

const copy = t('ar').mentorshipPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/ar/mentorship/', languages: { en: '/mentorship/', ar: '/ar/mentorship/' } },
}

export default function ArMentorshipPage() {
  return <MentorshipView lang="ar" />
}
