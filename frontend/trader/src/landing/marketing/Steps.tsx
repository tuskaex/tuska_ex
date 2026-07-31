'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Button from './ui/Button'
import { HEADING_SECTION } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

/* Reference-style cards: each card is a full-bleed brand-red surface. A
 * translucent tag pill sits bottom-left and a circular arrow action
 * bottom-right.
 *
 * These used to be /assets/hero_card{1,2,3}.png — flat #F04E23 tiles with
 * 3D orange props (pills, a gear) from the SwissCresta kit, paired with
 * indigo arrow glyphs. Both were off-brand, and repainting a bitmap is
 * not something we can do in-repo, so the artwork is now CSS: the same
 * layered-gradient treatment in the TuskaEx red ramp (#F14A4A → #D60101
 * → #A30000), varied per card so the three don't read as identical.
 * Bonus: they scale to any viewport and cost no bytes. */
const STEPS = [
  {
    id: 's1',
    background:
      'radial-gradient(120% 100% at 15% 0%, #F14A4A 0%, #D60101 45%, #A30000 100%)',
    arrowColor: '#D60101',
  },
  {
    id: 's2',
    background:
      'radial-gradient(130% 110% at 85% 10%, #F14A4A 0%, #C50101 50%, #8E0000 100%)',
    arrowColor: '#A30000',
  },
  {
    id: 's3',
    background:
      'radial-gradient(120% 100% at 50% 110%, #F14A4A 0%, #D60101 50%, #A30000 100%)',
    arrowColor: '#D60101',
  },
] as const

export default function Steps() {
  const { t } = useLang()
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={HEADING_SECTION}>
            {t('steps.titleA')} <span className="text-[#D60101]">{t('steps.titleB')}</span>
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {STEPS.map(({ id, background, arrowColor }, i) => (
            <li key={id} className="list-none">
              <Link
                href="/auth/register"
                className="group relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-3xl p-7 md:p-8 text-white shadow-[0_24px_60px_-22px_rgba(163,0,0,0.6)] transition-transform duration-300 hover:-translate-y-1"
                style={{ background }}
              >
                {/* Soft sheen so the flat gradient reads as a physical
                    surface rather than a solid colour fill — replaces the
                    specular highlight the old 3D artwork provided. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,rgba(255,255,255,0.22),transparent_60%)]"
                />

                {/* faint step-number watermark — kept clear of the top
                    edge and sized so it no longer collides with / gets
                    clipped by the heading and the rounded card corner. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 top-5 text-5xl font-extrabold leading-none text-white/40"
                >
                  0{i + 1}
                </span>

                {/* heading + copy — right padding keeps the title from
                    running underneath the step-number watermark. */}
                <h3 className="relative pr-12 text-xl font-bold leading-snug">{t(`steps.${id}.t`)}</h3>
                <p className="relative mt-3 max-w-[94%] text-sm leading-relaxed text-white/80">
                  {t(`steps.${id}.d`)}
                </p>

                {/* footer: tag pill + circular arrow */}
                <div className="relative mt-auto flex items-center justify-between pt-6">
                  <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
                    {t(`steps.${id}.tag`)}
                  </span>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 group-hover:translate-x-0.5"
                    style={{ color: arrowColor }}
                  >
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <Button variant="primary" href="/auth/register">
            {t('steps.cta')}
          </Button>
        </div>
      </div>
    </section>
  )
}
