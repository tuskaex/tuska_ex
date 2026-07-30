import { type ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  className?: string
}

export default function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.2em] text-gray-600 ${className}`}>
      {children}
    </p>
  )
}
