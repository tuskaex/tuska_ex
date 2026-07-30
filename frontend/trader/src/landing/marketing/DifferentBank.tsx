'use client'

import Image from 'next/image'
import ExploreLink from './ui/ExploreLink'
import { HEADING_SECTION } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

const CARD_KEYS = [
  { id: 'metals', href: '/precious-metals' },
  { id: 'currency', href: '/currency-pairs' },
  { id: 'cfds', href: '/cfds' },
] as const

export default function DifferentBank() {
  const { t } = useLang()
  return (
    <section className="bg-white">
      <div className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-24">
        <div className="bg-gray-50 rounded-[2rem] px-6 md:px-10 lg:px-16 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="md:col-span-5 order-2 md:order-1 flex justify-center md:justify-start">
              <div className="relative w-full max-w-[680px] aspect-[5/4]">
                <div
                  aria-hidden="true"
                  className="absolute inset-6 rounded-[2rem] bg-[#E94E1B]/20 blur-3xl"
                />
                <Image
                  src="/assets/bull.png"
                  alt="TuskaEx — bullish on your future"
                  fill
                  sizes="(max-width: 768px) 100vw, 680px"
                  className="relative object-contain drop-shadow-[0_28px_48px_rgba(233,78,27,0.28)]"
                />
              </div>
            </div>
            <div className="md:col-span-7 order-1 md:order-2">
              <h2 className={HEADING_SECTION}>
                {t('bank.titleA')} <span className="text-[#E94E1B]">{t('bank.titleB')}</span>
              </h2>
              <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed">
                {t('bank.lead')}
              </p>
              <p className="mt-4 text-base text-gray-600 leading-relaxed">
                {t('bank.sub')}
              </p>
            </div>
          </div>

          <div className="mt-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E94E1B]">
              {t('bank.eyebrow')}
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {CARD_KEYS.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-xl p-7 md:p-8 flex flex-col gap-4 border border-gray-200/60 hover:border-[#E94E1B]/40 hover:shadow-lg transition-all"
                >
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                    {t(`bank.cards.${card.id}.title`)}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t(`bank.cards.${card.id}.body`)}
                  </p>
                  <ExploreLink href={card.href} className="text-base mt-auto">
                    {t('bank.explore')}
                  </ExploreLink>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
