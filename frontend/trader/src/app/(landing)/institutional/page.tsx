import InstitutionalHero from '@/landing/marketing/institutional/InstitutionalHero'
import InstitutionalClients from '@/landing/marketing/institutional/InstitutionalClients'
import Humanness from '@/landing/marketing/institutional/Humanness'
import Services from '@/landing/marketing/institutional/Services'
import GrowthTools from '@/landing/marketing/institutional/GrowthTools'
import TrustNumbers from '@/landing/marketing/institutional/TrustNumbers'
import GoodForBusiness from '@/landing/marketing/institutional/GoodForBusiness'
import GetInTouch from '@/landing/marketing/institutional/GetInTouch'
import OurOffices from '@/landing/marketing/institutional/OurOffices'
import FollowUs from '@/landing/marketing/FollowUs'
import FooterLinks from '@/landing/marketing/FooterLinks'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Institutional',
  description: 'Institutional solutions for banks, brokers, funds and corporates.',
}

export default function InstitutionalPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <InstitutionalHero />
        <InstitutionalClients />
        <Humanness />
        <Services />
        <GrowthTools />
        <TrustNumbers />
        <GoodForBusiness />
        <GetInTouch />
        <OurOffices />
        <FollowUs />
        <FooterLinks />
        <Sponsors />
      </main>
      <Disclaimer />
    </div>
  )
}
