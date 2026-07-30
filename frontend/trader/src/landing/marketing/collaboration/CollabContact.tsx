import { ChevronRight } from 'lucide-react'
import ExploreLink from '../ui/ExploreLink'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface Office {
  name: string
  subtitle: string
}

const OFFICES: Office[] = [
  { name: 'Remote-first', subtitle: 'Distributed team' },
  { name: 'Support', subtitle: '24/5 coverage' },
  { name: 'Contact', subtitle: 'support@tuskaex.com' },
]

export default function CollabContact() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={HEADING_SECTION}>Get in touch</h2>
        <p className="mt-4 text-gray-600 max-w-xl">
          We are eager to know how we can further customise our solutions to your needs. Choose
          your TuskaEx office and reach out now!
        </p>
        <div className="mt-3">
          <ExploreLink>View all offices</ExploreLink>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OFFICES.map((office) => (
            <div key={office.name} className="relative overflow-hidden rounded-2xl">
              <ImagePlaceholder
                label={office.name}
                rounded="rounded-2xl"
                className="w-full aspect-[4/3]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-gray-900/10 to-transparent" />
              <div className="absolute left-5 bottom-4 text-white">
                <h3 className="text-xl font-extrabold uppercase tracking-tight">{office.name}</h3>
                <p className="text-xs opacity-90">{office.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end items-center gap-3">
          <span className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="w-2 h-2 rounded-full bg-[#E94E1B]" />
          </span>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#E94E1B] text-white flex items-center justify-center hover:bg-[#E94E1B] transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  )
}
