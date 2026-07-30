import Eyebrow from '../ui/Eyebrow'
import ExploreLink from '../ui/ExploreLink'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface WidgetProps {
  title: string
  value: string
  sub: string
  className?: string
}

function FloatingWidget({ title, value, sub, className = '' }: WidgetProps) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-36 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-gray-900 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-gray-600">{sub}</span>
      </div>
      <div className="mt-1 text-base font-bold text-gray-900">{value}</div>
      <div className="mt-2 flex gap-1">
        <span className="flex-1 h-1.5 rounded-sm bg-[#D60101]/70" />
        <span className="flex-1 h-1.5 rounded-sm bg-gray-900/80" />
        <span className="flex-1 h-1.5 rounded-sm bg-[#D60101]/40" />
      </div>
    </div>
  )
}

export default function PartnersPlatforms() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>Platforms</Eyebrow>
          <h2 className={`${HEADING_SECTION} mt-3`}>The tools to make it happen</h2>
        </div>

        <div className="relative mt-12 max-w-4xl mx-auto">
          <ImagePlaceholder label="Trading Platform" className="w-full aspect-[16/10] bg-gray-100" />
          <FloatingWidget
            title="EUR/USD"
            value="1.1716"
            sub="+0.05%"
            className="hidden md:block absolute -left-6 bottom-10"
          />
          <FloatingWidget
            title="OIL/USD"
            value="100.76"
            sub="-0.31%"
            className="hidden md:block absolute -right-6 top-10"
          />
        </div>

        <div className="mt-12 max-w-3xl mx-auto text-center">
          <p className="text-gray-600 leading-relaxed">
            With TuskaEx, you and your clients get access to our trading and banking platforms
            (CFXD, TuskaEx App, etc.), with TradingView charts, integrated Autochartist, and
            the necessary features to easily receive and transfer your commissions. Efficient
            client digital onboarding, advanced client tracking systems and comprehensive
            reporting tools are the cherry on top.
          </p>
          <div className="mt-6 flex justify-center">
            <ExploreLink>Explore</ExploreLink>
          </div>
        </div>
      </div>
    </section>
  )
}
