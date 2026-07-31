'use client'

import Image from 'next/image'
import BrowserFrame from './ui/BrowserFrame'
import Eyebrow from './ui/Eyebrow'
import { HEADING_SECTION } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

export default function Platforms() {
  const { t } = useLang()
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>{t('platforms.eyebrow')}</Eyebrow>
          <h2 className={`mt-4 ${HEADING_SECTION}`}>
            {t('platforms.titleA')} <span className="text-[#D60101]">{t('platforms.titleB')}</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed">
            {t('platforms.lead1')}{' '}
            <span className="font-bold text-[#D60101]">{t('platforms.lead2')}</span>.
          </p>
        </div>

        {/* Was /assets/trading platform.png — a stock render of the
            SwissCresta terminal (their logo in the top-left and a
            watermark across the chart). Replaced with the real TuskaEx
            terminal screenshot already in the repo. It is 900px wide, so
            the column is capped at 900px rather than upscaled, and the
            browser chrome carries the extra visual weight. */}
        <div className="relative mt-14 md:mt-20 max-w-[900px] mx-auto">
          <div
            aria-hidden="true"
            className="absolute -inset-6 md:-inset-10 rounded-[2.5rem] bg-[#D60101]/10 blur-3xl"
          />
          <BrowserFrame className="relative">
            <Image
              src="/marketing/banner-1.png"
              alt="The TuskaEx web terminal — live XAUUSD chart, order ticket and open positions"
              width={900}
              height={562}
              priority={false}
              className="block w-full h-auto"
              sizes="(max-width: 768px) 100vw, 900px"
            />
          </BrowserFrame>
        </div>
      </div>
    </section>
  )
}
