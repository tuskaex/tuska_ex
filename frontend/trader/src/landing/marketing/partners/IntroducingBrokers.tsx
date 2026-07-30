import Eyebrow from '../ui/Eyebrow'
import ExploreLink from '../ui/ExploreLink'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function IntroducingBrokers() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <Eyebrow>Introducing Brokers</Eyebrow>
            <h2 className={`${HEADING_SECTION} mt-3`}>
              Growing your business means serving your clients
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed max-w-xl">
              Build your client base and boost your revenue with TuskaEx&apos;s swift,
              tailored solutions for your business. In exchange, your clients get unrivalled
              access to financial products and platforms that match the quality they&apos;re used
              to.
            </p>
            <div className="mt-6">
              <ExploreLink>Explore</ExploreLink>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center lg:justify-end">
            <ImagePlaceholder
              label="Phone"
              rounded="rounded-[2.5rem]"
              className="w-56 h-[26rem] md:w-64 md:h-[28rem] bg-white border-gray-200 shadow-sm"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
