import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function MmHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-12 pb-10 md:pt-16 md:pb-14">
        <h1 className={HEADING_SECTION}>Money managers</h1>
        <p className="mt-5 max-w-2xl text-sm md:text-base text-gray-600 leading-relaxed">
          TuskaEx offers multiple trade allocation tools integrated with deep liquidity and
          precise execution, allowing full hedging and order capabilities not found with other
          brokers.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-5">
          <Button variant="primary" className="px-6 py-3 rounded-md">
            Become a partner
          </Button>
          <a
            href="#mm-platform"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D60101] hover:text-[#D60101] transition-colors"
          >
            <span>Access our platform</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </a>
        </div>

        <div className="mt-10">
          <ImagePlaceholder label="Building" className="w-full aspect-[16/6] rounded-2xl" />
        </div>
      </div>
    </section>
  )
}
