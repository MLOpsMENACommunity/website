import { Inter, JetBrains_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ScrollProgress from '@/components/ScrollProgress'
import JsonLd from '@/components/JsonLd'
import { themeScript } from '@/lib/theme'
import { organizationSchema } from '@/lib/schema'
import { t, type Lang } from '@/lib/i18n'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
/** Arabic display face. Falls back to Inter for the Latin runs inside Arabic text. */
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

/**
 * The `<html>`/`<body>` shell. Each edition has its own root layout — that is
 * the only way to put `lang` and `dir` on `<html>` in a static export — and both
 * render this so the chrome stays in one place.
 */
export default function RootShell({
  lang,
  children,
}: {
  lang: Lang
  children: React.ReactNode
}) {
  const copy = t(lang)

  return (
    <html
      lang={copy.htmlLang}
      dir={copy.dir}
      className={`${inter.variable} ${mono.variable} ${arabic.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The entity every other schema node on the site points back at. */}
        <JsonLd data={organizationSchema()} />
      </head>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          {copy.nav.skipToContent}
        </a>
        <Nav lang={lang} />
        <ScrollProgress label={copy.common.backToTop} />
        <main id="main" className="pt-16 enter-fade">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  )
}
