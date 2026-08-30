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

        <div className="hidden items-center gap-0.5 xl:flex">
          {nav.map((item) => {
            const href = localeHref(lang, item.href)
            const active = pathname.startsWith(href)
            return (
              <Link
                key={item.key}
                href={href}
                data-active={active}
                className={`nav-link inline-flex min-h-10 flex-col items-center justify-center rounded-full px-3 py-2 text-center text-[13px] font-medium transition-colors duration-200 ${
                  active ? 'text-fg' : 'text-muted hover:text-fg'
                }`}
              >
                {copy.nav.items[item.key]}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={switchHref}
            hrefLang={lang === 'en' ? 'ar' : 'en'}
            title={copy.switchLangLabel}
            className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-muted transition duration-300 hover:border-cyan-400/50 hover:text-cyan-400"
          >
            <Languages className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-[18deg]" />
            {copy.otherLangName}
          </Link>
          <ThemeToggle label={copy.nav.themeToDark} />
          <a
            href={channels[primaryChannel]}
            target="_blank"
            rel="noreferrer"
            className="btn-primary group hidden !px-5 !py-2.5 sm:inline-flex"
          >
            {copy.nav.join}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-body transition-colors duration-200 hover:bg-surface-hover hover:text-fg xl:hidden"
            aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={open}
          >
            <span className="relative block h-5 w-5">
              <Menu
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                  open ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
                }`}
              />
              <X
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                  open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Height-animated rather than mounted/unmounted, so the panel slides. */}
      <div
        className={`grid overflow-hidden border-line bg-nav backdrop-blur-xl transition-all duration-300 ease-out xl:hidden ${
          open ? 'grid-rows-[1fr] border-t' : 'grid-rows-[0fr] border-t-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-1 px-5 py-4">
            {nav.map((item, i) => (
                <Link
                  key={item.key}
                  href={localeHref(lang, item.href)}
                  style={{ transitionDelay: open ? `${60 + i * 35}ms` : '0ms' }}
                  className={`block rounded-lg px-3 py-2.5 text-center text-sm font-medium text-body transition-all duration-300 hover:bg-surface-hover hover:text-fg ${
                    open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}
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
      </div>
    </header>
  )
}
