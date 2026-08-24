'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X, ArrowUpRight, Languages } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { nav, channels, primaryChannel } from '~/site.config'
import { t, localeHref, otherLangHref, type Lang } from '@/lib/i18n'

export default function Nav({ lang = 'en' }: { lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const copy = t(lang)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever navigation happens.
  useEffect(() => setOpen(false), [pathname])

  const switchHref = otherLangHref(lang, pathname)

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${
        scrolled ? 'border-b border-line bg-nav backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-content items-center justify-between px-5 sm:px-8">
        <Logo lang={lang} />

        <div className="hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const href = localeHref(lang, item.href)
            const active = pathname.startsWith(href)
            return (
              <Link
                key={item.key}
                href={href}
                className={`rounded-full px-3 py-2 text-[13px] font-medium transition ${
                  active ? 'text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {copy.nav.items[item.key]}
                {active && <span className="mx-auto mt-1 block h-px w-5 brand-gradient" />}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={switchHref}
            hrefLang={lang === 'en' ? 'ar' : 'en'}
            title={copy.switchLangLabel}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-muted transition hover:border-cyan-400/50 hover:text-cyan-400"
          >
            <Languages className="h-3.5 w-3.5" />
            {copy.otherLangName}
          </Link>
          <ThemeToggle label={copy.nav.themeToDark} />
          <a
            href={channels[primaryChannel]}
            target="_blank"
            rel="noreferrer"
            className="btn-primary hidden !px-5 !py-2.5 sm:inline-flex"
          >
            {copy.nav.join}
            <ArrowUpRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-body hover:bg-surface-hover hover:text-fg lg:hidden"
            aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-nav backdrop-blur-xl lg:hidden">
          <div className="space-y-1 px-5 py-4">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={localeHref(lang, item.href)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-body hover:bg-surface-hover hover:text-fg"
              >
                {copy.nav.items[item.key]}
              </Link>
            ))}
            <a
              href={channels[primaryChannel]}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-2 w-full"
            >
              {copy.nav.join}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
