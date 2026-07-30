import { Check } from 'lucide-react'
import ImagePlaceholder from '../ui/ImagePlaceholder'

const ITEMS = [
  'Wide range of competitive financial products',
  'Powerful and user-friendly trading platforms',
  'Exclusive market research throughout the day',
  'Dedicated multilingual customer support team',
] as const

export default function IbAndYourClients() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 flex justify-center lg:justify-start">
            <ImagePlaceholder
              label="Client on phone"
              className="w-full max-w-md aspect-[4/5]"
              rounded="rounded-2xl"
            />
          </div>

          <div className="lg:col-span-6">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-gray-900 leading-tight">
              …And your clients
            </h2>
            <ul className="mt-8 flex flex-col gap-4">
              {ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E94E1B] text-white flex-shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm md:text-[15px] text-gray-900">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
