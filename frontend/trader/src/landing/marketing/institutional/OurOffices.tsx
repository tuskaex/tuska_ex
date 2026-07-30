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

export default function OurOffices() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={HEADING_SECTION}>Our offices</h2>
        <div className="mt-3">
          <ExploreLink>See all offices</ExploreLink>
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
      </div>
    </section>
  )
}
