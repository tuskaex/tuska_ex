import Button from '../ui/Button'
import ImagePlaceholder from '../ui/ImagePlaceholder'

export default function IbHero() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 pt-10 pb-12 md:pt-14 md:pb-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-gray-900 leading-[0.95]">
            Introducing brokers
          </h1>
          <p className="mt-6 text-sm md:text-base text-gray-600 leading-relaxed max-w-xl">
            Thought the days of building your client base were tedious and unrewarding? Not for
            long. Offer your clients TuskaEx&apos;s best-in-class financial services, and get
            rewarded in the process.
          </p>
          <div className="mt-6">
            <Button variant="primary" className="px-6 py-3 rounded-md">
              Become a partner
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <ImagePlaceholder
            label="Building"
            className="w-full aspect-[16/6]"
            rounded="rounded-2xl"
          />
        </div>
      </div>
    </section>
  )
}
