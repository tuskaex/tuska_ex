import Eyebrow from '../ui/Eyebrow'
import ExploreLink from '../ui/ExploreLink'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function MoneyManagers() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 flex justify-center lg:justify-start">
            <ImagePlaceholder
              label="Phone"
              rounded="rounded-[2.5rem]"
              className="w-56 h-[26rem] md:w-64 md:h-[28rem] bg-white border-gray-200 shadow-sm"
            />
          </div>

          <div className="lg:col-span-6">
            <Eyebrow>Money Managers</Eyebrow>
            <h2 className={`${HEADING_SECTION} mt-3`}>Precision, performance and deep liquidity</h2>
            <p className="mt-5 text-gray-600 leading-relaxed max-w-xl">
              Elevate your Forex and CFD trading on behalf of your clients with TuskaEx&apos;s
              multiple trade allocation tools, integrated with deep liquidity and precise
              execution, allowing full hedging and order capabilities not found with other brokers.
            </p>
            <div className="mt-6">
              <ExploreLink>Explore</ExploreLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
