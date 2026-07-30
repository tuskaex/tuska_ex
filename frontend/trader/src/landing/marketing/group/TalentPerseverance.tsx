import Eyebrow from '../ui/Eyebrow'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

export default function TalentPerseverance() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <Eyebrow>History</Eyebrow>
        <h2 className={`${HEADING_SECTION} mt-3 max-w-2xl`}>Talent meets perseverance</h2>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          <div className="relative rounded-2xl overflow-hidden">
            <ImagePlaceholder
              label="Founders"
              rounded="rounded-2xl"
              className="w-full aspect-[4/3]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
            <div className="absolute left-6 bottom-6 right-6 text-white">
              <h3 className="text-sm font-bold uppercase">
                The beginning of TuskaEx, the end of banking as we know it
              </h3>
              <p className="mt-2 text-xs text-white/85 leading-relaxed max-w-md">
                At the founding of TuskaEx, a group of computer experts set out to build a
                pioneering trade execution offer that would later empower investors and high
                engagement to its clients.
              </p>
            </div>
          </div>

          <div className="bg-[#E94E1B] text-white rounded-2xl p-6 md:p-8 flex flex-col gap-4">
            <ImagePlaceholder
              label="Article"
              rounded="rounded-md"
              className="w-32 h-40 bg-white border-gray-200"
            />
            <h3 className="text-base md:text-lg font-bold">
              Built by engineers, for traders
            </h3>
            <p className="text-sm text-white/90 leading-relaxed">
              Get the inside story of how TuskaEx was built — the engineering decisions,
              the execution stack, and the people behind the platform.
            </p>
            <div className="mt-auto">
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline-offset-2 hover:underline"
              >
                Read the article →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
