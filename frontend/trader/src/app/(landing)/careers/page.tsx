import CareersHero from '@/landing/marketing/careers/CareersHero'
import JoinUs from '@/landing/marketing/careers/JoinUs'
import GreatPlace from '@/landing/marketing/careers/GreatPlace'
import WeAreAllIn from '@/landing/marketing/careers/WeAreAllIn'
import HumansAsset from '@/landing/marketing/careers/HumansAsset'
import FollowUs from '@/landing/marketing/FollowUs'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Careers',
  description: 'Join the TuskaEx team. We are all in.',
}

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <CareersHero />
        <JoinUs />
        <GreatPlace />
        <WeAreAllIn />
        <HumansAsset />
        <FollowUs />
        <Sponsors />
      </main>
      <Disclaimer minimal />
    </div>
  )
}
