import type { Metadata } from 'next'
import ArticlesView from '@/views/ArticlesView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').articlesPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/articles',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArArticlesPage() {
  return <ArticlesView lang="ar" />
}
