import { Check } from 'lucide-react'
import { HEADING_SECTION } from '../ui/headings'

const ADVANTAGES = [
  'Complement your skill set with the reliability of a professional multi-asset trading platform.',
  "The efficiency-boosting features of our platforms are designed to lighten your and your clients' daily business.",
  'Offer your clients access to a wide range of Forex & CFD products, plus sophisticated trading tools.',
] as const

export default function YourAdvantages() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <h2 className={`${HEADING_SECTION} text-center`}>Your advantages</h2>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {ADVANTAGES.map((text) => (
            <div
              key={text}
              className="bg-gray-50 rounded-2xl p-6 md:p-7 flex flex-col gap-4"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#E94E1B] text-white">
                <Check className="w-5 h-5" strokeWidth={3} />
              </span>
              <p className="text-sm md:text-[15px] text-gray-900 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
