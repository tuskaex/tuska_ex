'use client'

import Eyebrow from './ui/Eyebrow'
import ExploreLink from './ui/ExploreLink'
import { HEADING_SECTION } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

export default function Securities() {
  const { t } = useLang()
  return (
    <section
      className="h-[646px] flex items-center bg-[#F6F6F3] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/assets/hero_banner1.png)' }}
    >
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16">
        <div className="max-w-2xl text-left">
          <Eyebrow>{t('securities.eyebrow')}</Eyebrow>
          <h2 className={`mt-4 ${HEADING_SECTION}`}>
            {t('securities.titleA')}{' '}
            <span className="text-[#E94E1B]">{t('securities.titleB')}</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-700 leading-relaxed">
            {t('securities.lead')}
          </p>
          <p className="mt-4 text-xs italic text-gray-600">{t('securities.regulated')}</p>
          <div className="mt-6 flex justify-start">
            <ExploreLink>{t('securities.explore')}</ExploreLink>
          </div>
        </div>
      </div>
    </section>
  )
}
