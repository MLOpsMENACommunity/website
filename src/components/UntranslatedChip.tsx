import { Languages } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { isTranslated } from '@/lib/content-i18n'

/**
 * Marks a card on /ar whose body copy has no Arabic translation yet.
 *
 * Content can be added faster than it can be translated — a new session, an
 * imported article — and the fallback is to render it in English. Without a
 * marker an Arabic reader just hits a card in another language with no
 * explanation; with one it reads as a known gap.
 *
 * Renders nothing on the English edition, and nothing once a translation
 * exists, so it disappears on its own.
 */
export default function UntranslatedChip({
  lang,
  kind,
  itemKey,
}: {
  lang: Lang
  kind: 'session' | 'article' | 'roadmap'
  itemKey: string
}) {
  if (lang !== 'ar' || isTranslated(kind, itemKey)) return null
  return (
    <span className="chip !px-2 !py-0.5 text-[10px] text-faint" dir="rtl">
      <Languages className="h-3 w-3" />
      {t(lang).common.inEnglish}
    </span>
  )
}
