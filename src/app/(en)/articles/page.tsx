import type { Metadata } from 'next'
import ArticlesView from '@/views/ArticlesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('en').articlesPage

export const metadata: Metadata = pageMetadata({
  lang: 'en',
  path: '/articles',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function EnArticlesPage() {
  return <ArticlesView lang="en" />
}
