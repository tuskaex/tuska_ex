'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HEADING_SECTION } from '../ui/headings'

interface Slide {
  tag: string
  bg: string
}

const SLIDES: Slide[] = [
  { tag: 'Our mindset', bg: '#7EC8A0' },
  { tag: 'Our culture', bg: '#F5D14B' },
  { tag: 'Our team', bg: '#D14B4B' },
  { tag: 'Our values', bg: '#5E81AC' },
]

function SlideCard({ slide }: { slide: Slide }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-shrink-0 w-full md:w-[calc(50%-10px)] aspect-[4/5] md:aspect-[5/4]"
      style={{ backgroundColor: slide.bg }}
    >
      <span className="absolute top-4 right-4 bg-white text-gray-900 text-xs font-semibold rounded-full px-3 py-1 shadow-sm">
        {slide.tag}
      </span>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-3/4 bg-white/15 rounded-t-full"
        aria-hidden="true"
      />
    </div>
  )
}

export default function WeAreAllIn() {
  const [index, setIndex] = useState(0)
  const max = SLIDES.length - 2

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(max, i + 1))

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={`${HEADING_SECTION} text-center`}>We are all in</h2>

        <div className="mt-10 overflow-hidden">
          <div
            className="flex gap-5 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(calc(${index} * (-50% - 10px)))` }}
          >
            {SLIDES.map((slide) => (
              <SlideCard key={slide.tag} slide={slide} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index >= max}
            className="w-9 h-9 rounded-full bg-[#E94E1B] text-white flex items-center justify-center hover:bg-[#E94E1B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  )
}
