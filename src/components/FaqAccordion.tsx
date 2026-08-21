'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function FaqAccordion({
  items,
}: {
  items: readonly { q: string; a: string }[]
}) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.03] sm:px-6"
              >
                <span className="text-sm font-semibold text-white sm:text-base">{item.q}</span>
                <Plus
                  className={`mt-0.5 h-5 w-5 shrink-0 text-cyan-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                />
              </button>
            </h3>
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400 sm:px-6">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
