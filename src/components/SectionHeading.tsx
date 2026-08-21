import type { ReactNode } from 'react'

export default function SectionHeading({
  eyebrow, title, accent, children, align = 'left',
}: {
  eyebrow: string
  title: string
  accent?: string
  children?: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
        {title} {accent && <span className="brand-text">{accent}</span>}
      </h2>
      {children && <p className="mt-4 text-base leading-relaxed text-slate-400">{children}</p>}
    </div>
  )
}
