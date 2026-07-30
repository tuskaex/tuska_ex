import ImagePlaceholder from '../ui/ImagePlaceholder'
import { TEXT_DISPLAY } from '../ui/headings'

export default function GroupHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-10 pb-12 md:pt-14 md:pb-16">
        <h1 className={`${TEXT_DISPLAY} text-gray-900 leading-[0.95]`}>Imagine…</h1>
        <p className="mt-6 max-w-2xl text-sm md:text-base text-gray-600 leading-relaxed">
          …a trading platform unlike any other. Founded by engineers, known for demystifying trading,
          recognised for its innovative power. A journalist may call it a success story. We
          prefer to think of it as just the beginning.
        </p>

        <div className="mt-10">
          <ImagePlaceholder label="Headquarters" className="w-full aspect-[16/6]" />
        </div>
      </div>
    </section>
  )
}
