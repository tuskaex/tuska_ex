'use client'

import Image from 'next/image'
import Eyebrow from './ui/Eyebrow'
import ExploreLink from './ui/ExploreLink'
import { HEADING_SECTION } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

export default function AboutUs() {
  const { t } = useLang()
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="md:col-span-5">
            <Eyebrow>{t('about.eyebrow')}</Eyebrow>
            <h2 className={`mt-4 ${HEADING_SECTION}`}>
              {t('about.titleA')}{' '}
              <span className="text-[#D60101]">{t('about.titleB')}</span>
            </h2>
            <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed">
              {t('about.lead')}
            </p>
            <div className="mt-6">
              <ExploreLink href="/about">{t('about.learnMore')}</ExploreLink>
            </div>
          </div>

          <div className="md:col-span-7 flex justify-center md:justify-end">
            <div className="relative w-full max-w-[920px] aspect-[4/5] md:aspect-[5/6]">
              <div
                aria-hidden="true"
                className="absolute inset-10 rounded-[2.5rem] bg-[#D60101]/25 blur-3xl"
              />
              <Image
                src="/assets/asianboy.png"
                alt="TuskaEx trader"
                fill
                sizes="(max-width: 768px) 100vw, 920px"
                className="relative object-contain drop-shadow-[0_36px_60px_rgba(0,0,0,0.28)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
