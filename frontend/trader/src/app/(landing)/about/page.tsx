import { Users, Target, Shield, Globe } from 'lucide-react'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = { title: 'About Us — TuskaEx' }

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            About TuskaEx<br />
            <span className="text-[#D60101]">Revolutionizing Global Trading</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            We're on a mission to democratize trading by providing everyone with institutional-grade tools, transparent pricing, and complete financial freedom.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Our Story</h2>
          </div>
          <div className="prose prose-lg max-w-none space-y-6">
            <p className="text-gray-500 leading-relaxed">
              TuskaEx was founded with a simple belief: trading should be accessible, transparent, and fair for everyone. We saw traders struggling with high fees, slow withdrawals, and limited access to global markets. We decided to change that.
            </p>
            {/* Was: "Today, TuskaEx serves thousands of traders across
                150+ countries…". The users table held four rows. A new
                platform saying so is not a weakness; claiming scale it
                does not have is the thing that costs trust later. */}
            <p className="text-gray-500 leading-relaxed">
              TuskaEx is a new platform, and we would rather say so than inflate a
              number. What we have built is real: 59 instruments across six asset
              classes, a professional web terminal, copy trading and PAMM, and an
              open API for anyone who would rather let their own code trade.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Our commitment is simple: provide the best trading experience with zero compromises on security, speed, or transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Our Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              To become the world's most trusted trading platform by putting traders first.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: 'Trader-First', desc: 'Every decision we make starts with what\'s best for our traders.' },
              { icon: Target, title: 'Innovation', desc: 'Continuously pushing boundaries with cutting-edge technology.' },
              { icon: Shield, title: 'Trust', desc: 'Building long-term relationships through transparency and reliability.' },
              { icon: Globe, title: 'Global Access', desc: 'Making institutional-grade trading available to everyone, everywhere.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 bg-[#FDE3E3] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-[#D60101]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">By the Numbers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Was 150+ countries / 50K+ active traders / $500M+ daily
                volume / 99.9% uptime. Against the production database:
                four users, two trading accounts, eleven trades in total,
                and no uptime instrumentation of any kind. Every figure
                below is instead a platform capability that is true on
                day one and does not quietly expire. */}
            {[
              { value: '59', label: 'Tradable Instruments' },
              { value: '6', label: 'Asset Classes' },
              { value: '1:100', label: 'Maximum Leverage' },
              { value: '200', label: 'Max Open Positions' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-extrabold text-[#D60101] mb-2">{value}</div>
                <div className="text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Disclaimer />
    </div>
  )
}
