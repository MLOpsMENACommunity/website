'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Light is the default. A visitor's explicit choice is remembered in
 * localStorage; the inline script in layout.tsx applies it before first paint,
 * so this component only has to keep the button label in sync.
 */
export default function ThemeToggle({ label }: { label: string }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* private mode — the choice just does not persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:border-cyan-400/50 hover:text-cyan-400"
    >
      {/* Before mount both icons would be a guess, so render the light-mode icon
          and swap once the real class is known. No layout shift either way. */}
      {mounted && dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
