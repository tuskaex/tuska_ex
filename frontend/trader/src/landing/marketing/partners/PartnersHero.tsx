import Button from '../ui/Button'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { TEXT_DISPLAY } from '../ui/headings'

export default function PartnersHero() {
  return (
    <section className="bg-white overflow-hidden">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-12 pb-20 md:pt-16 md:pb-28 relative">
        <div className="hidden lg:block absolute top-12 right-6 xl:right-20 w-[38%] xl:w-[36%] z-0">
          <div className="relative">
            <ImagePlaceholder label="Building" className="w-full aspect-[5/6]" />
            <ImagePlaceholder
              label="App"
              rounded="rounded-[2.5rem]"
              className="absolute -bottom-10 -left-10 w-40 h-72 lg:w-44 lg:h-80 shadow-lg bg-white border-gray-200"
            />
          </div>
        </div>

        <h1 className={`relative z-10 ${TEXT_DISPLAY} text-[#E94E1B] leading-[0.9]`}>
          Your clients deserve the best.
        </h1>

        <div className="relative z-10 mt-10 max-w-xl">
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            Grow your business with a solid partner. Offer your clients your expertise mixed with
            TuskaEx&apos;s financial strength, transparency and security.
          </p>
          <div className="mt-8">
            <Button variant="primary" className="px-6 py-3 rounded-md">
              Become a partner
            </Button>
          </div>
        </div>

        <div className="lg:hidden mt-12 relative">
          <ImagePlaceholder label="Building" className="w-full aspect-[4/3]" />
          <ImagePlaceholder
            label="App"
            rounded="rounded-[2.5rem]"
            className="hidden md:flex absolute -bottom-10 -left-6 w-40 h-72 shadow-lg bg-white border-gray-200"
          />
        </div>
      </div>
    </section>
  )
}
