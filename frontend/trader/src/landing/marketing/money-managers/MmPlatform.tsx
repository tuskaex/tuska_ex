import { ChevronRight } from 'lucide-react'
import ExploreLink from '../ui/ExploreLink'
import { HEADING_SECTION } from '../ui/headings'

const DOWNLOADS = [
  { title: 'Download the live platform for windows' },
  { title: 'Download the live platform for mac' },
  { title: 'Download the live platform for linux' },
  { title: 'Download the demo platform for windows' },
] as const

export default function MmPlatform() {
  return (
    <section id="mm-platform" className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="bg-gray-50 rounded-3xl px-6 md:px-10 lg:px-14 py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className={HEADING_SECTION}>Access our platform</h2>
            <p className="mt-4 text-sm md:text-base text-gray-600 leading-relaxed">
              A comprehensive solution for money managers and professional traders.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOWNLOADS.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-xl p-5 md:p-6 flex flex-col gap-4 border border-gray-200/60"
              >
                <h3 className="text-base font-bold text-gray-900 leading-snug">{card.title}</h3>
                <ExploreLink>Download</ExploreLink>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end items-center gap-3">
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
      </div>
    </section>
  )
}
