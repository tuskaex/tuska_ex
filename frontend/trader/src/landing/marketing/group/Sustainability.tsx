import { Check } from 'lucide-react'
import Eyebrow from '../ui/Eyebrow'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface PillarData {
  title: string
  body: string
}

const PILLARS: PillarData[] = [
  {
    title: 'Innovation and tech',
    body: 'We develop new products to serve our clients better, we strive to make opportunities more accessible to all and we challenge convention via our technology.',
  },
  {
    title: 'Responsible Business Conduct',
    body: "We work hard to safeguard our clients' financial interests, approach our business with integrity in our DNA and provide exceptional value to investors.",
  },
  {
    title: 'Attractive Employer',
    body: 'We are a bank that takes employees feel at home, is committed to supporting the communities where its business takes place and is set to develop great talent.',
  },
  {
    title: 'Customer-Centric',
    body: "We are relentless in understanding clients' wants and needs, cultivating our credibility and protecting clients' data with the highest level of security.",
  },
]

function Pillar({ title, body }: PillarData) {
  return (
    <div className="bg-white/15 rounded-xl p-4 md:p-5 flex flex-col gap-2">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#E94E1B]">
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <p className="text-xs text-white/85 leading-relaxed">{body}</p>
    </div>
  )
}

export default function Sustainability() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="relative rounded-3xl bg-[#E94E1B] text-white overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8 p-8 md:p-10 lg:p-12">
              <Eyebrow className="text-white/85">Sustainability</Eyebrow>
              <h2 className={`${HEADING_SECTION} mt-3 text-white`}>
                A positive impact is the greatest benefit of all
              </h2>
              <p className="mt-5 text-white/90 leading-relaxed max-w-2xl text-sm md:text-base">
                We create customer value by setting our focus on innovation, ethics, people and
                planet. We act so as to make a positive impact on society, make responsible
                decisions and engage in sound practices towards all our stakeholders.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PILLARS.map((p) => (
                  <Pillar key={p.title} title={p.title} body={p.body} />
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span className="w-2 h-2 rounded-full bg-white/40" />
              </div>
            </div>

            <div className="lg:col-span-4 relative min-h-[240px]">
              <ImagePlaceholder
                label="Sustainability"
                rounded="rounded-none"
                className="absolute inset-0 w-full h-full border-0 bg-[#E94E1B]/40"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
