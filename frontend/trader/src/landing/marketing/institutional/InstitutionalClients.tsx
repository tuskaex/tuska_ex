'use client'

import { useState } from 'react'
import ExploreLink from '../ui/ExploreLink'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface Tab {
  key: string
  label: string
  body: string
}

const TABS: readonly [Tab, ...Tab[]] = [
  {
    key: 'banks',
    label: 'Banks',
    body: 'From innovative banking services to expert investment tools, our offerings are designed to provide banks a financial institution to rely on.',
  },
  {
    key: 'brokers',
    label: 'Brokers',
    body: 'Reliable execution, deep liquidity and a complete instrument range — a full white-label offering for brokers worldwide.',
  },
  {
    key: 'funds',
    label: 'Funds',
    body: 'Custody, trading and reporting tools tailored for funds, with the discretion and rigor of an institutional desk.',
  },
  {
    key: 'asset-managers',
    label: 'Asset Managers',
    body: 'A complete platform for asset managers, including allocation tools, multi-asset access and full reporting.',
  },
  {
    key: 'corporates',
    label: 'Corporates',
    body: 'Treasury, FX hedging and cash management products purpose-built for corporate clients.',
  },
]

export default function InstitutionalClients() {
  const [active, setActive] = useState<string>(TABS[0].key)
  const current: Tab = TABS.find((t) => t.key === active) ?? TABS[0]

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={`${HEADING_SECTION} text-center`}>Institutional clients</h2>

        <div className="mt-10">
          <ImagePlaceholder label="Architecture" className="w-full aspect-[16/6] rounded-2xl" />
        </div>

        <div className="mt-6 flex justify-center">
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

        <div className="mt-8 max-w-3xl mx-auto text-center">
          <h3 className="text-lg font-bold text-gray-900">{current.label}</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">{current.body}</p>
          <div className="mt-5 flex justify-center">
            <ExploreLink>Learn more</ExploreLink>
          </div>
        </div>
      </div>
    </section>
  )
}
