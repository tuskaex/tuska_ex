'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Eyebrow from '../ui/Eyebrow'
import { HEADING_SECTION } from '../ui/headings'

interface Feature {
  title: string
  body: string
}

const FEATURES: Feature[] = [
  {
    title: 'Strength',
    body: 'TuskaEx Group boasts a Tier 1 Capital Ratio among the highest in the industry, ensuring its financial strength and resilience.',
  },
  {
    title: 'Transparency',
    body: 'We hold ourselves to high standards of transparency and operational rigor across every product on the platform.',
  },
  {
    title: 'Security',
    body: 'TuskaEx applies modern security practices end-to-end — segregated client funds, encrypted infrastructure, and continuous monitoring against fraud and abuse.',
  },
  {
    title: 'Trust',
    body: "Over 500k clients have trusted TuskaEx's services. The access to one of the largest Forex & CFDs offerings worldwide and our 3 pops platforms: MT4, MT5 and CFXD.",
  },
  {
    title: 'Innovation',
    body: 'Exclusive expert analysis and research and the most comprehensive trading platforms on the market coupled with high-performance applications. TuskaEx challenges innovation — for your success.',
  },
  {
    title: 'Excellence',
    body: 'Years of consistent product delivery, recognised industry awards, and a relentless drive for client experience excellence sit at the heart of everything we ship.',
  },
]

function useVisibleCount(): number {
  const [count, setCount] = useState(3)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1024) setCount(3)
      else if (w >= 768) setCount(2)
      else setCount(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return count
}

function FeatureCard({ title, body }: Feature) {
  return (
    <div className="bg-white rounded-xl p-5 md:p-6 flex flex-col gap-3 shadow-sm h-full">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#D60101] text-white">
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  )
}

export default function SolidPartner() {
  const visible = useVisibleCount()
  const [index, setIndex] = useState(0)
  const maxIndex = Math.max(0, FEATURES.length - visible)

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex)
  }, [maxIndex, index])

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1))

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>A Solid Partner</Eyebrow>
          <h2 className={`${HEADING_SECTION} mt-3`}>
            Your expertise is your best attribute. TuskaEx, its best complement.
          </h2>
        </div>

        <div className="mt-12 relative rounded-3xl bg-[#D60101] text-white overflow-hidden">
          <div className="p-6 md:p-10 lg:p-12">
            <p className="max-w-3xl text-sm md:text-[15px] leading-relaxed text-white/95">
              As a leader in digital trading, TuskaEx offers reliability, innovation
              and competence altogether, aiming to serve your business and your clients as if
              they were our own.
            </p>

            <div className="mt-8 overflow-hidden -mx-2">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${index * (100 / visible)}%)` }}
              >
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex-shrink-0 px-2"
                    style={{ width: `${100 / visible}%` }}
                  >
                    <FeatureCard title={f.title} body={f.body} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={prev}
                  disabled={index === 0}
                  aria-label="Previous"
                  className="w-9 h-9 rounded-full bg-white text-[#D60101] flex items-center justify-center transition-opacity hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={index >= maxIndex}
                  aria-label="Next"
                  className="w-9 h-9 rounded-full bg-white text-[#D60101] flex items-center justify-center transition-opacity hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
