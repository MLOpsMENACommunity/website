import Image from 'next/image'
import Link from 'next/link'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="MLOps MENA Community — home">
      <Image
        src="/logo-mark.png"
        alt=""
        width={48}
        height={48}
        priority
        className="h-10 w-10 shrink-0 rounded-lg object-cover transition group-hover:scale-105"
      />
      {!compact && (
        <span className="hidden text-sm font-semibold leading-tight text-white sm:block">
          MLOps MENA
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
            Community
          </span>
        </span>
      )}
    </Link>
  )
}
