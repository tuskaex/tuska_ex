import Button from '../ui/Button'
import GptwBadge from './GptwBadge'
import { TEXT_DISPLAY } from '../ui/headings'

const TILES = [
  { bg: '#E76F3B' },
  { bg: '#F4C53A' },
  { bg: '#3F88C5' },
  { bg: '#F2A6C8' },
  { bg: '#C9D86A' },
  { bg: '#C5D0E0' },
]

export default function CareersHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <h1 className={`${TEXT_DISPLAY} text-[#E94E1B] leading-[0.9]`}>All in!</h1>
            <p className="mt-7 max-w-xl text-base md:text-lg text-gray-600 leading-relaxed">
              We are building the bank of tomorrow. This means combining our differences to
              imagine, discuss, code, develop, test, learn… and celebrate every step together. It
              takes more than skills: we need to be all in.
            </p>
            <div className="mt-7">
              <Button variant="primary" className="px-6 py-3 rounded-md">
                Check our Manifesto
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 relative">
            <div className="grid grid-cols-3 gap-2 md:gap-3 aspect-[3/2]">
              {TILES.map((tile, i) => (
                <div
                  key={i}
                  className="relative rounded-md overflow-hidden flex items-end justify-center"
                  style={{ backgroundColor: tile.bg }}
                >
                  <div className="w-3/5 h-3/4 bg-white/15 rounded-t-full" aria-hidden="true" />
                </div>
              ))}
            </div>
            <GptwBadge className="absolute -bottom-6 -right-2 md:-bottom-8 md:-right-4" />
          </div>
        </div>
      </div>
    </section>
  )
}
