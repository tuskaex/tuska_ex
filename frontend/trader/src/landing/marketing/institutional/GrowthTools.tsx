'use client'

import { useState } from 'react'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface Tab {
  key: string
  label: string
}

const TABS: readonly [Tab, ...Tab[]] = [
  { key: 'trading', label: 'Trading Platform' },
  { key: 'liquidity', label: 'Liquidity Coverage' },
  { key: 'venues', label: 'Cross Trading Venues' },
  { key: 'apis', label: 'APIs' },
]

export default function GrowthTools() {
  const [active, setActive] = useState<string>(TABS[0].key)

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className={HEADING_SECTION}>The tools to power your growth</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Our technology solutions are designed to help professional clients achieve peak
            efficiency with seamless performance, intuitive platforms, and superior execution.
          </p>
        </div>

        <div className="relative mt-12 max-w-5xl mx-auto">
          <ImagePlaceholder label="Trading Platform" className="w-full aspect-[16/9]" />
          <div className="hidden md:block absolute -left-4 bottom-10 bg-[#E94E1B] text-white rounded-xl shadow-xl p-4 w-56">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Trading Platform</div>
            <p className="mt-2 text-xs leading-relaxed">
              Our dedicated trading platform for institutional clients. Easy on the eye, intuitive
              and powerful.
            </p>
            <div className="mt-3">
              <a
                href="#"
                className="text-xs font-semibold underline-offset-2 hover:underline"
              >
                Learn more →
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-full p-1">
            {TABS.map((tab) => {
              const isActive = tab.key === active
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={`px-4 py-1.5 text-xs md:text-sm font-medium rounded-full transition-colors ${
                    isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
