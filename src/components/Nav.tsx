'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import Logo from './Logo'
import { nav, channels, primaryChannel } from '~/site.config'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever navigation happens.
  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${
        scrolled ? 'border-b border-white/10 bg-ink-900/85 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-content items-center justify-between px-5 sm:px-8">
        <Logo />

        <div className="hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-[13px] font-medium transition ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
                {active && <span className="mx-auto mt-1 block h-px w-5 brand-gradient" />}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={channels[primaryChannel]}
            target="_blank"
            rel="noreferrer"
            className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex"
          >
            Join the Community
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-ink-900/95 backdrop-blur-xl lg:hidden">
          <div className="space-y-1 px-5 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={channels[primaryChannel]}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-2 w-full"
            >
              Join the Community
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
