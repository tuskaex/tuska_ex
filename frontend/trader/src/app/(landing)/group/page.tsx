import GroupHero from '@/landing/marketing/group/GroupHero'
import NumberWorthThousand from '@/landing/marketing/group/NumberWorthThousand'
import UnleashBand from '@/landing/marketing/group/UnleashBand'
import CraftingBanking from '@/landing/marketing/group/CraftingBanking'
import TalentPerseverance from '@/landing/marketing/group/TalentPerseverance'
import YuhRing from '@/landing/marketing/group/YuhRing'
import Sustainability from '@/landing/marketing/group/Sustainability'
import TrustableWorld from '@/landing/marketing/group/TrustableWorld'
import QuoteSection from '@/landing/marketing/group/QuoteSection'
import AnnualReport from '@/landing/marketing/group/AnnualReport'
import FollowUs from '@/landing/marketing/FollowUs'
import FooterLinks from '@/landing/marketing/FooterLinks'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Group',
  description: 'A trading platform unlike any other. The TuskaEx Group.',
}

export default function GroupPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <GroupHero />
        <NumberWorthThousand />
        <UnleashBand />
        <CraftingBanking />
        <TalentPerseverance />
        <YuhRing />
        <Sustainability />
        <TrustableWorld />
        <QuoteSection />
        <AnnualReport />
        <FollowUs />
        <FooterLinks />
        <Sponsors />
      </main>
      <Disclaimer minimal />
    </div>
  )
}
