import ExploreLink from '../ui/ExploreLink'

interface Card {
  title: string
  body: string
  cta: string
}

const CARDS: Card[] = [
  {
    title: 'Partner Guide',
    body: 'A complete summary of all TuskaEx Forex and CFD products with their corresponding trading conditions.',
    cta: 'Read the guide',
  },
  {
    title: 'Trading Conditions',
    body: 'Our commitment to you: fair dealing and price execution. All trading costs are included in the spreads – no hidden fees.',
    cta: 'Check conditions',
  },
  {
    title: 'Forex inspiration',
    body: 'Inspiration fuels mastery. Access our wealth of impressional material on Forex and CFDs.',
    cta: 'Discover',
  },
]

export default function PartnerGuide() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-8">
          {CARDS.map((card) => (
            <div key={card.title} className="border-t border-gray-200 pt-6 flex flex-col gap-3">
              <h3 className="text-base md:text-lg font-bold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">{card.body}</p>
              <div>
                <ExploreLink>{card.cta}</ExploreLink>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
