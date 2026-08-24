import type { Metadata } from 'next'
import MentorshipView from '@/views/MentorshipView'
import { t } from '@/lib/i18n'

const copy = t('en').mentorshipPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/mentorship/', languages: { en: '/mentorship/', ar: '/ar/mentorship/' } },
}

export default function EnMentorshipPage() {
  return <MentorshipView lang="en" />
}
