import { ChevronRight } from 'lucide-react'

function YuhCard({ tag }: { tag: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#FFD9D2] p-6 md:p-8 min-h-[280px] md:min-h-[320px]">
      <div className="text-xs text-gray-900/80 mb-2">2020</div>
      <div className="font-extrabold text-2xl md:text-3xl text-[#E94E1B] tracking-tight">yuh</div>
      <p className="mt-4 text-gray-900 font-bold text-lg md:text-xl max-w-[12rem] leading-tight">
        {tag}
      </p>
      <div
        className="absolute right-4 bottom-4 w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#E94E1B]/30"
        aria-hidden="true"
      />
      <div
        className="absolute right-10 bottom-2 w-24 h-32 md:w-28 md:h-36 bg-white/40 rounded-2xl"
        aria-hidden="true"
      />
    </div>
  )
}

function RingCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-50 p-6 md:p-8 min-h-[280px] md:min-h-[320px] flex items-center justify-center">
      <div className="absolute top-4 left-6 text-xs text-gray-900/80">2023</div>
      <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-full border-[24px] md:border-[32px] border-[#E94E1B]/30 bg-white" />
      <span
        className="absolute top-12 right-10 w-3 h-3 rounded-full bg-[#E94E1B]"
        aria-hidden="true"
      />
    </div>
  )
}

export default function YuhRing() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-5">
          <YuhCard tag="Make your money grow!" />
          <RingCard />
        </div>

        <div className="mt-6 flex justify-end items-center gap-3">
          <span className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E94E1B]" />
            <span className="w-2 h-2 rounded-full bg-gray-200" />
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
