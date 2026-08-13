import MmHero from '@/landing/marketing/money-managers/MmHero'
import MmFeatures from '@/landing/marketing/money-managers/MmFeatures'
import MmRockSolid from '@/landing/marketing/money-managers/MmRockSolid'
import MmForm from '@/landing/marketing/money-managers/MmForm'
import MmPlatform from '@/landing/marketing/money-managers/MmPlatform'
import MmGuide from '@/landing/marketing/money-managers/MmGuide'
import FollowUs from '@/landing/marketing/FollowUs'
import FooterLinks from '@/landing/marketing/FooterLinks'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Money Managers',
  description: 'Precision, performance and deep liquidity for money managers.',
}

export default function MoneyManagersPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <MmHero />
        <MmFeatures />
        <MmRockSolid />
        <MmForm />
        <MmPlatform />
        <MmGuide />
        <FollowUs />
        <FooterLinks />
        <Sponsors />
      </main>
      <Disclaimer />
    </div>
  )
}
