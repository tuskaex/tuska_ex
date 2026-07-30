import ExploreLink from '../ui/ExploreLink'

interface Card {
  title: string
  body: string
  cta: string
}

const CARDS: Card[] = [
  {
    title: 'Product Guide',
    body: 'A complete summary of all TuskaEx Forex and CFD products with their corresponding trading conditions.',
    cta: 'Read the guide',
  },
  {
    title: 'Trading Conditions',
    body: 'Our commitment to you: fair execution. All trading costs are included in the spreads — no hidden fees.',
    cta: 'Check conditions',
  },
  {
    title: 'Forex Education',
    body: 'Need to brush up on your Forex knowledge? Our education section will get you up to speed in no time!',
    cta: 'Discover',
  },
]

export default function MmGuide() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-gray-200/70 p-6 md:p-7 flex flex-col gap-4"
            >
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
