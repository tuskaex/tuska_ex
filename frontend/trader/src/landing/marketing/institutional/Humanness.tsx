import Eyebrow from '../ui/Eyebrow'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function Humanness() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="relative rounded-3xl bg-[#E94E1B] text-white overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 p-8 md:p-10 lg:p-12 flex flex-col justify-center">
              <Eyebrow className="text-white/80">Collaboration</Eyebrow>
              <h2 className={`${HEADING_SECTION} mt-3 text-white`}>
                Humanness: the key factor to a successful business
              </h2>
              <p className="mt-5 text-white/90 leading-relaxed max-w-md">
                At TuskaEx, you benefit from a trusted stock-listed relationship with a
                dedicated partner. Our representatives are available daily and regularly meet
                with clients in person, combining their technical expertise and industry-trained
                insights to help grow your business.
              </p>
              <div className="mt-6">
                <button type="button" className="fx-explore-btn">
                  Explore
                </button>
              </div>
            </div>
            <div className="lg:col-span-6 relative min-h-[260px]">
              <ImagePlaceholder
                label="Office"
                rounded="rounded-none"
                className="absolute inset-0 w-full h-full border-0 bg-[#E94E1B]/40"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
