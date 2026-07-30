'use client'

import Image from 'next/image'
import Button from './ui/Button'
import Eyebrow from './ui/Eyebrow'
import { useLang } from '@/landing/i18n/LangProvider'

export default function Hero() {
  const { t } = useLang()
  return (
    <section className="relative bg-white overflow-x-clip">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[640px] md:min-h-[720px] lg:min-h-[760px]">
        <div className="relative flex items-center bg-white px-6 md:px-10 lg:px-16 py-16 md:py-20 lg:py-24">
          <div className="w-full max-w-2xl">
            <Eyebrow className="text-[#E94E1B]">{t('hero.eyebrow')}</Eyebrow>
            <h1 className="mt-5 font-extrabold uppercase tracking-[-0.02em] leading-[0.98] text-gray-900 text-[clamp(2.6rem,5.4vw,5.5rem)]">
              {t('hero.headlineA')}<br />
              <span className="text-[#E94E1B]">{t('hero.headlineB')}</span><br />
              {t('hero.headlineC')}
            </h1>
            <p className="mt-7 text-base md:text-lg text-gray-700 leading-relaxed max-w-xl">
              {t('hero.sub')}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button variant="primary" href="/auth/register">{t('hero.ctaOpen')}</Button>
              <Button variant="outline" href="/demo-account">{t('hero.ctaDemo')}</Button>
            </div>
          </div>
        </div>

        <div className="relative bg-white min-h-[420px] md:min-h-0 flex items-center justify-center p-8 md:p-10 lg:p-14">
          <div className="relative w-full h-full max-w-[680px]">
            <div
              aria-hidden="true"
              className="absolute inset-6 md:inset-8 rounded-full bg-[#E94E1B]/30 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-12 md:inset-16 rounded-full bg-[#E94E1B]/20 blur-2xl"
            />
            <Image
              src="/assets/hero page.png"
              alt="TuskaEx trading platform"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="relative object-contain drop-shadow-[0_30px_50px_rgba(233,78,27,0.35)]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
