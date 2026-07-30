import CollabHero from '@/landing/marketing/collaboration/CollabHero'
import AddedValue from '@/landing/marketing/collaboration/AddedValue'
import Strategy from '@/landing/marketing/collaboration/Strategy'
import CollabContact from '@/landing/marketing/collaboration/CollabContact'
import FollowUs from '@/landing/marketing/FollowUs'
import FooterLinks from '@/landing/marketing/FooterLinks'
import Sponsors from '@/landing/marketing/Sponsors'
import Disclaimer from '@/landing/marketing/Disclaimer'

export const metadata = {
  title: 'Collaboration — TuskaEx',
  description: 'Closeness. Bespoke services for institutional clients.',
}

export default function CollaborationPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main>
        <CollabHero />
        <AddedValue />
        <Strategy />
        <CollabContact />
        <FollowUs />
        <FooterLinks />
        <Sponsors />
      </main>
      <Disclaimer minimal />
    </div>
  )
}
