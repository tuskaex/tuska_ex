import Eyebrow from '../ui/Eyebrow'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function HumansAsset() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6">
            <ImagePlaceholder label="Team" className="w-full aspect-[4/3]" />
          </div>

          <div className="lg:col-span-6">
            <Eyebrow>Perks &amp; Benefits</Eyebrow>
            <h2 className={`${HEADING_SECTION} mt-3`}>Humans are our main asset</h2>
            <p className="mt-5 text-gray-600 leading-relaxed max-w-xl">
              Sponsored training programs, discounts, flexible home office, shares and options
              plans, ever-coming events, free breakfast, a pub… Work in a tie or work in a tee —
              whichever way, we hand you the means to fulfil your aspirations and have an impact
              on the industry, while enjoying yourself.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
