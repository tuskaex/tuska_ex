import Eyebrow from './ui/Eyebrow'
import ImagePlaceholder from './ui/ImagePlaceholder'

const SPONSORS = ['Sponsor 1', 'Sponsor 2', 'Sponsor 3', 'Sponsor 4'] as const

export default function Sponsors() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pb-20 md:pb-24 text-center">
        <Eyebrow className="text-center">Sponsors</Eyebrow>
        <div className="mt-8 flex flex-wrap justify-center items-center gap-6">
          {SPONSORS.map((label) => (
            <ImagePlaceholder
              key={label}
              className="w-24 h-24 sm:w-28 sm:h-28"
              rounded="rounded-full"
              label="Logo"
              showIcon={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
