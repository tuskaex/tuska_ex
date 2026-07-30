'use client'

import { MapPin, Phone } from 'lucide-react'
import { useLang } from '@/landing/i18n/LangProvider'

const COL_IDS = ['client', 'partner', 'help'] as const

export default function FooterLinks() {
  const { t } = useLang()
  const cols = COL_IDS.map((id) => {
    const links = [t(`footerLinks.cols.${id}.l1`), t(`footerLinks.cols.${id}.l2`)]
      .filter((s) => !s.startsWith('footerLinks.cols.'))
    return { id, heading: t(`footerLinks.cols.${id}.h`), links }
  })

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pb-10 md:pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E94E1B]">
            {t('footerLinks.eyebrow')}
          </p>
          <p className="mt-3 text-base text-gray-700">{t('footerLinks.lead')}</p>
        </div>

        <div
          className="mt-10 grid gap-10"
          style={{
            gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
            textAlign: 'center',
            maxWidth: '64rem',
            margin: '0 auto',
          }}
        >
          {cols.map((col) => (
            <div key={col.id} className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#E94E1B]">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-gray-600 hover:text-[#E94E1B] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-700">
          <a
            href="tel:+33759159987"
            className="inline-flex items-center gap-2 hover:text-[#E94E1B] transition-colors"
          >
            <Phone className="w-4 h-4 text-[#E94E1B]" strokeWidth={2} />
            +33 7 59 15 99 87
          </a>
          <span className="hidden sm:inline w-px h-4 bg-gray-300" aria-hidden="true" />
          <span className="inline-flex items-center gap-2 text-center">
            <MapPin className="w-4 h-4 text-[#E94E1B] shrink-0" strokeWidth={2} />
            Rue de la Tour-de-l&apos;Île 4, 1204 Genève
          </span>
        </div>
      </div>
    </section>
  )
}
