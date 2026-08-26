import type { Metadata } from 'next'
import MentorshipView from '@/views/MentorshipView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').mentorshipPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/mentorship',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnMentorshipPage() {
  return <MentorshipView lang="en" />
}
