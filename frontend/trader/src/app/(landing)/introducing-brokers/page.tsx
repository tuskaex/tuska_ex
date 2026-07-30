import IbHero from '@/landing/marketing/introducing-brokers/IbHero'
import IbBestForYou from '@/landing/marketing/introducing-brokers/IbBestForYou'
import IbAndYourClients from '@/landing/marketing/introducing-brokers/IbAndYourClients'
import IbRockSolid from '@/landing/marketing/introducing-brokers/IbRockSolid'
import IbMediaLogos from '@/landing/marketing/introducing-brokers/IbMediaLogos'
import IbContactForm from '@/landing/marketing/introducing-brokers/IbContactForm'
import IbBottomCards from '@/landing/marketing/introducing-brokers/IbBottomCards'
import FollowUs from '@/landing/marketing/FollowUs'
import FooterLinks from '@/landing/marketing/FooterLinks'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Introducing Brokers — TuskaEx',
  description: "Build your client base with TuskaEx's IB program.",
}

export default function IntroducingBrokersPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <IbHero />
        <IbBestForYou />
        <IbAndYourClients />
        <IbRockSolid />
        <IbMediaLogos />
        <IbContactForm />
        <IbBottomCards />
        <FollowUs />
        <FooterLinks />
        <Sponsors />
      </main>
      <Disclaimer />
    </div>
  )
}
