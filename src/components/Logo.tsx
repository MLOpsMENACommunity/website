import Image from 'next/image'
import Link from 'next/link'
import { asset } from '@/lib/asset'
import { localeHref, type Lang } from '@/lib/i18n'

export default function Logo({ compact = false, lang = 'en' }: { compact?: boolean; lang?: Lang }) {
  return (
    <Link
      href={localeHref(lang, '/')}
      className="group flex items-center gap-3"
      aria-label="MLOps MENA Community"
    >
      <Image
        src={asset("/logo-mark.png")}
        alt=""
        width={48}
        height={48}
        priority
        className="h-10 w-10 shrink-0 rounded-lg object-cover transition group-hover:scale-105"
      />
      {!compact && (
        <span className="hidden text-sm font-semibold leading-tight text-fg sm:block">
          MLOps MENA
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Community
          </span>
        </span>
      )}
    </Link>
  )
}
