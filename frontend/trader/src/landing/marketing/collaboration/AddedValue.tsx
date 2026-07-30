import { type ReactNode } from 'react'
import { User } from 'lucide-react'
import { HEADING_SECTION } from '../ui/headings'

interface ImageCardProps {
  label?: string
  title: string
  body: string
  className?: string
}

function ImageCard({ label = '', title, body, className = '' }: ImageCardProps) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#475a6b] text-white min-h-[280px] ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(112,135,150,0.85) 0%, rgba(60,85,100,0.95) 50%, rgba(20,30,40,1) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/55 to-transparent z-10"
        aria-hidden="true"
      />
      <div className="absolute left-6 bottom-5 right-6 z-20">
        <h3 className="text-base md:text-lg font-bold">{title}</h3>
        <p className="mt-2 text-xs md:text-sm text-white/90 leading-relaxed max-w-md">{body}</p>
      </div>
      {label && (
        <span className="absolute top-3 left-4 text-[10px] uppercase tracking-widest text-white/40">
          {label}
        </span>
      )}
    </div>
  )
}

function GaugeIllustration() {
  return (
    <div className="relative w-full aspect-[5/3] flex items-center justify-center">
      <div
        className="relative w-44 h-24 md:w-56 md:h-32 border-[14px] md:border-[18px] border-[#E94E1B] rounded-t-full border-b-0"
        aria-hidden="true"
      >
        <span
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#E94E1B] text-white flex items-center justify-center"
          aria-hidden="true"
        >
          <User className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  )
}

function ChartIllustration() {
  return (
    <div className="relative w-full aspect-[5/3] flex items-center justify-center">
      <svg
        viewBox="0 0 200 80"
        className="w-full h-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <polyline
          points="0,60 25,40 50,55 75,30 100,42 125,18 150,28 175,12 200,20"
          fill="none"
          stroke="#E94E1B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="75" cy="30" r="3" fill="#E94E1B" />
      </svg>
      <span className="absolute left-[36%] top-1 text-[11px] font-bold text-[#E94E1B] bg-[#E94E1B]/15 px-2 py-0.5 rounded">
        + 6%
      </span>
    </div>
  )
}

interface GraphicCardProps {
  illustration: ReactNode
  title: string
  body: string
}

function GraphicCard({ illustration, title, body }: GraphicCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-50 min-h-[280px] flex flex-col">
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center">{illustration}</div>
      <div className="p-6 md:p-7">
        <h3 className="text-base md:text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-xs md:text-sm text-gray-600 leading-relaxed max-w-md">{body}</p>
      </div>
    </div>
  )
}

export default function AddedValue() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={HEADING_SECTION}>Our added value</h2>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          <ImageCard
            title="A partner just for you"
            body="Work with a dedicated expert who will be in regular touch with you and your business goals."
          />
          <GraphicCard
            illustration={<GaugeIllustration />}
            title="Bespoke service"
            body="Benefit from personalised solutions, rigorously tested through in-depth analysis before going live."
          />
          <GraphicCard
            illustration={<ChartIllustration />}
            title="Deep knowledge"
            body="We perform ceaseless research on your activity, sector and opportunities."
          />
          <ImageCard
            title="Evergoing collaboration"
            body="You'll get regular post Go-Live check-ins, support and adjustments as your needs evolve."
          />
        </div>
      </div>
    </section>
  )
}
