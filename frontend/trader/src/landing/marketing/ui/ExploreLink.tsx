'use client'

import { ArrowRight } from 'lucide-react'
import { type ReactNode } from 'react'

interface ExploreLinkProps {
  href?: string
  children?: ReactNode
  className?: string
}

export default function ExploreLink({
  href = '#',
  children = 'Explore',
  className = '',
}: ExploreLinkProps) {
  return (
    <a href={href} className={`fx-explore-btn group w-fit ${className}`}>
      <span>{children}</span>
      <ArrowRight
        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.5}
      />
    </a>
  )
}
