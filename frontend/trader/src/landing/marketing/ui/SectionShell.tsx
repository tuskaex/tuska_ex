import { type ReactNode } from 'react'

interface SectionShellProps {
  children: ReactNode
  /** Inner container width — `wide` keeps the marketing default, `narrow` is a 5xl reading column. */
  width?: 'wide' | 'narrow'
  /** Section background override. Defaults to white. */
  bg?: string
  className?: string
}

/**
 * Shared section + container wrapper used by every marketing page section.
 * Replaces the legacy `container-x` / `container-narrow` utility classes
 * that lived in the deleted source app's globals.css.
 */
export default function SectionShell({
  children,
  width = 'wide',
  bg = 'bg-white',
  className = '',
}: SectionShellProps) {
  const container =
    width === 'narrow' ? 'max-w-5xl mx-auto px-6' : 'w-full mx-auto px-6 md:px-10 lg:px-16'
  return (
    <section className={`${bg} ${className}`}>
      <div className={container}>{children}</div>
    </section>
  )
}
