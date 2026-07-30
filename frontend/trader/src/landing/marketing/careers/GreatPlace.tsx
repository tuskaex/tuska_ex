import GptwBadge from './GptwBadge'
import { HEADING_SECTION } from '../ui/headings'

export default function GreatPlace() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <div className="bg-gray-50 rounded-2xl p-10 flex items-center justify-center w-full max-w-sm aspect-square">
              <GptwBadge className="scale-[2.2] origin-center" />
            </div>
          </div>

          <div className="lg:col-span-7">
            <h2 className={HEADING_SECTION}>Great!</h2>
            <p className="mt-5 text-gray-600 leading-relaxed max-w-xl">
              Our employees have spoken! Our company culture is amazing and our Great Place to
              Work certification proves it!
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
