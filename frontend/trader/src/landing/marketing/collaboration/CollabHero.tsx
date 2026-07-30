import Button from '../ui/Button'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function CollabHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-10 pb-10 md:pt-14 md:pb-12">
        <h1 className={HEADING_SECTION}>Closeness.</h1>
        <p className="mt-5 max-w-2xl text-sm md:text-base text-gray-600 leading-relaxed">
          We know that behind every successful business, there are uber-talented humans with
          specific needs and expectations, and we work accordingly. Our formula: constant
          collaboration, common goals and bespoke services.
        </p>

        <div className="mt-6">
          <Button variant="primary" className="px-6 py-3 rounded-md">
            Work with us
          </Button>
        </div>

        <div className="mt-10">
          <ImagePlaceholder label="Headquarters" className="w-full aspect-[16/6] rounded-2xl" />
        </div>
      </div>
    </section>
  )
}
