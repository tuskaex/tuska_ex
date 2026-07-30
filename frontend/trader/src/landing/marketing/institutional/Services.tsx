import { type ReactNode } from 'react'
import Eyebrow from '../ui/Eyebrow'
import ImagePlaceholder from '../ui/ImagePlaceholder'
import { HEADING_SECTION } from '../ui/headings'

interface ServiceCardProps {
  title: string
  body: string
  children?: ReactNode
  className?: string
}

function ServiceCard({ title, body, children = null, className = '' }: ServiceCardProps) {
  return (
    <div className={`bg-gray-50 rounded-2xl p-6 md:p-7 flex flex-col gap-4 ${className}`}>
      {children}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function CryptoCoins() {
  const coins = [
    { size: 56, top: '10%', right: '8%' },
    { size: 44, top: '40%', right: '18%' },
    { size: 64, top: '15%', right: '26%' },
    { size: 38, top: '60%', right: '6%' },
    { size: 50, top: '55%', right: '30%' },
    { size: 36, top: '25%', right: '40%' },
    { size: 30, top: '70%', right: '22%' },
  ]
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {coins.map((c, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#D60101]/20 border border-[#D60101]/30"
          style={{ width: c.size, height: c.size, top: c.top, right: c.right }}
        />
      ))}
    </div>
  )
}

export default function Services() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-24">
        <Eyebrow>Discover Solutions</Eyebrow>
        <h2 className={`${HEADING_SECTION} mt-3 max-w-3xl`}>
          Services designed for business success
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          <ServiceCard
            title="All things trading, one single platform"
            body="TuskaEx's intelligent brokerage solutions for institutional clients to deploy their portfolio, with the objective to access the diversity, execution and pricing for a sound financial decision."
          >
            <ImagePlaceholder
              label="Platform"
              className="w-full aspect-[16/9] bg-white border-gray-200"
            />
          </ServiceCard>

          <ServiceCard
            title="Create your own, or choose one of ours"
            body="Offering a one-stop solution, our comprehensive suite of services includes built fund management, advisory tools and platforms for amazing financial decisions."
          >
            <ImagePlaceholder
              label="Cube"
              className="w-full aspect-[16/9] bg-white border-gray-200"
            />
          </ServiceCard>

          <ServiceCard
            title="Your one-stop Forex solution"
            body="Offering a one-stop solution, our comprehensive suite of services includes deep-bid market liquidity, advisory tools and platforms for amazing financial decisions."
          />

          <ServiceCard
            title="Liquidity: the driving force behind Forex"
            body="Access a vast spectrum of Forex instruments seamlessly, supported by reliable execution, advanced technologies and extended data centers."
          >
            <ImagePlaceholder
              label="Phone"
              rounded="rounded-[2rem]"
              className="w-40 h-72 mx-auto bg-white border-gray-200"
            />
          </ServiceCard>

          <div className="md:col-span-2 relative bg-gray-50 rounded-2xl p-6 md:p-10 overflow-hidden">
            <CryptoCoins />
            <div className="relative max-w-xl">
              <h3 className="text-base md:text-lg font-bold text-gray-900">
                Trade with the first European bank to believe in crypto
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                While many were still seeing crypto as a fiction, we at TuskaEx went all-in
                on crypto. As early believers, we possess the technological expertise to provide
                professional banking services to your digital assets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
