import { ChevronRight } from 'lucide-react'

interface Card {
  title: string
  body: string
  link: string
}

const CARDS: Card[] = [
  {
    title: 'Product Guide',
    body: 'A complete summary of CFD and Forex products with their corresponding trading conditions.',
    link: 'Read the guide',
  },
  {
    title: 'Trading Conditions',
    body: 'Our commitment to you: fair dealing and price execution. All trading costs are included in the spreads – no hidden fees.',
    link: 'View conditions',
  },
  {
    title: 'Forex Education',
    body: 'Need to brush up on your Forex knowledge? Our education section will get you up to speed in no time!',
    link: 'Learn more',
  },
]

export default function IbBottomCards() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-5">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-gray-50 rounded-2xl p-6 md:p-7 flex flex-col gap-3"
            >
              <h3 className="text-base md:text-lg font-bold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed flex-1">{card.body}</p>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#E94E1B] hover:underline underline-offset-2 mt-2"
              >
                <span>{card.link}</span>
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
