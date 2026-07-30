import { Check } from 'lucide-react'
import Eyebrow from '../ui/Eyebrow'
import { HEADING_SECTION } from '../ui/headings'

const TILES = [
  { bg: '#F4C53A' },
  { bg: '#F2A6C8' },
  { bg: '#3F88C5' },
  { bg: '#F5D14B' },
  { bg: '#C9D86A' },
  { bg: '#7EC8A0' },
]

const VALUES = [
  'Unite as one.',
  'Dare to be different.',
  'Do the right thing.',
  'In pursuit of excellence.',
  'Always say it how it is.',
  'Champion the customer.',
] as const

export default function CraftingBanking() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6">
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
          </div>

          <div className="lg:col-span-6">
            <Eyebrow>Values</Eyebrow>
            <h2 className={`${HEADING_SECTION} mt-3`}>Crafting tomorrow&apos;s banking</h2>
            <p className="mt-4 text-gray-600 leading-relaxed max-w-xl">
              We want to be the world&apos;s most pioneering and intuitive digital bank.
              Therefore we challenge convention via the delivery of innovation and technology.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {VALUES.map((value) => (
                <li key={value} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E94E1B] text-white flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-gray-900">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
