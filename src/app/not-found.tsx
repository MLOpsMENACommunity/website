import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-content flex-col items-center justify-center px-5 text-center sm:px-8">
      <p className="font-mono text-6xl font-bold brand-text">404</p>
      <h1 className="mt-6 text-2xl font-bold">This page did not make it to production</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        The link is broken or the page has moved. Head back and try from there.
      </p>
      <Link href="/" className="btn-primary mt-8">
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
    </section>
  )
}
