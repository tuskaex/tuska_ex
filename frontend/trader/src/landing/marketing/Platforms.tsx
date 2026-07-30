'use client'

import Image from 'next/image'
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
            {t('platforms.titleA')} <span className="text-[#E94E1B]">{t('platforms.titleB')}</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed">
            {t('platforms.lead1')}{' '}
            <span className="font-bold text-[#E94E1B]">{t('platforms.lead2')}</span>.
          </p>
        </div>

        <div className="relative mt-14 md:mt-20 max-w-6xl mx-auto">
          <div
            aria-hidden="true"
            className="absolute -inset-6 md:-inset-10 rounded-[2.5rem] bg-[#E94E1B]/10 blur-3xl"
          />
          <Image
            src="/assets/trading platform.png"
            alt="TuskaEx trading platform"
            width={1920}
            height={1080}
            priority={false}
            className="relative w-full h-auto object-contain rounded-2xl"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>
      </div>
    </section>
  )
}
