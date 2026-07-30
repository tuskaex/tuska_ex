import Button from '../ui/Button'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { TEXT_DISPLAY } from '../ui/headings'

export default function InstitutionalHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <h1 className={`${TEXT_DISPLAY} text-[#E94E1B] leading-[0.95]`}>
              Creating
              <br />
              success.
            </h1>
            <p className="mt-7 max-w-xl text-base md:text-lg text-gray-600 leading-relaxed">
              Our mission: growing the assets under management of our institutional clients, our
              cutting edge solutions are our most solid stability.
            </p>
            <div className="mt-7">
              <Button variant="primary" className="px-6 py-3 rounded-md">
                Work with us
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <ImagePlaceholder label="Vista" className="w-full aspect-[5/4] lg:aspect-[4/3]" />
          </div>
        </div>
      </div>
    </section>
  )
}
