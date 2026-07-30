'use client'

import { type ReactNode, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'ghost'

type CommonProps = {
  variant?: Variant
  href?: string
  children: ReactNode
  className?: string
}

type ButtonAsButton = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>
type ButtonAsAnchor = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps>

export type ButtonProps = ButtonAsButton | ButtonAsAnchor

const STYLES: Record<Variant, string> = {
  primary: 'bg-[#E94E1B] text-white hover:bg-[#E94E1B]',
  outline: 'border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
  ghost: 'text-gray-900 hover:text-[#E94E1B]',
}

export default function Button(props: ButtonProps) {
  const { variant = 'primary', href, children, className = '', ...rest } = props as CommonProps & Record<string, unknown>
  const base =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-semibold transition-colors whitespace-nowrap'
  const classes = `${base} ${STYLES[variant] ?? STYLES.primary} ${className}`

  if (href) {
    return (
      <a href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
