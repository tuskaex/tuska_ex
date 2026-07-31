'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/landing/i18n/LangProvider'

interface DisclaimerProps {
  minimal?: boolean
}

const BOTTOM_LINKS: { id: 'privacy' | 'terms' | 'risk' | 'vuln'; href: string }[] = [
  { id: 'privacy', href: '/privacy' },
  { id: 'terms', href: '/terms' },
  { id: 'risk', href: '/risk' },
  { id: 'vuln', href: '/privacy#vulnerability' },
]

export default function Disclaimer({ minimal = false }: DisclaimerProps) {
  const { t } = useLang()
  return (
    <footer className="bg-[#D60101] text-white/85 text-xs">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        {/* This chip must be WHITE in both themes, and both defences here
            are deliberate.

            It sits on the brand-red band — red in light AND dark — and is
            white so the black logo artwork reads against the red. The
            first attempt used `bg-white` + `.mkt-keep-light`, and it
            still shipped invisible: `.mkt-dark .mkt-keep-light` and
            `.mkt-dark .bg-white` are both specificity 0,2,0, and on a tie
            the later rule wins — the surface remap is declared first in
            the sheet, so the opt-out lost.

            `bg-[#FFFFFF]` is now the real fix: marketing-dark.css matches
            `.bg-white`, and this is a different class entirely, so no
            override can reach it regardless of order. `mkt-keep-light`
            stays because it also cancels the dark sheet's global image
            brightness knock-down, which was dimming the logo.

            Do not "tidy" this back to `bg-white`. */}
        <Link href="/" aria-label="TuskaEx home" className="inline-block mb-8">
          <span className="mkt-keep-light inline-flex items-center bg-[#FFFFFF] rounded-xl px-4 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            <Image
              src="/marketing/tuskaex-logo.png"
              alt="TuskaEx"
              width={1947}
              height={361}
              priority={false}
              className="h-8 md:h-9 w-auto"
            />
          </span>
        </Link>

        {!minimal && (
          <>
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              {t('disclaimer.title')}
            </h3>
            <p className="mt-4 leading-relaxed max-w-5xl">{t('disclaimer.p1')}</p>
            <p className="mt-4 leading-relaxed max-w-5xl">{t('disclaimer.p2')}</p>
            <p className="mt-4 leading-relaxed max-w-5xl">{t('disclaimer.p3')}</p>
            <p className="mt-4 leading-relaxed max-w-5xl text-white/95">{t('disclaimer.p4')}</p>
            <p className="mt-6 leading-relaxed max-w-5xl text-white/95">
              <span className="font-semibold text-white">{t('disclaimer.hq')}</span>{' '}
              {t('disclaimer.hqAddr')}
            </p>
          </>
        )}

        <div
          className={`${minimal ? '' : 'mt-10'} pt-6 ${minimal ? '' : 'border-t border-white/25'} flex flex-col md:flex-row md:items-center md:justify-between gap-3`}
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {BOTTOM_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="text-white/85 hover:text-white underline-offset-4 hover:underline transition-colors"
              >
                {t(`disclaimer.links.${link.id}`)}
              </Link>
            ))}
          </div>
          <div className="text-right text-white/95">{t('disclaimer.copyright')}</div>
        </div>
      </div>
    </footer>
  )
}
