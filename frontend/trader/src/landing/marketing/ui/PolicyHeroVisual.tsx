import { BadgeCheck, Scale } from 'lucide-react'

/**
 * Document-stack visual for the /policy hero.
 *
 * The hero is a two-column grid but only the left column ever had
 * content, so the right half was just the bare
 * /assets/Policy_hero_bg3.png background — a large flat orange smear
 * with nothing in it. This fills that column and lets the orange
 * bitmap be dropped entirely.
 *
 * Three offset sheets read as "the documents", the front one carrying a
 * seal. The body text is rendered as neutral bars rather than real
 * sentences: this is decoration beside a legal heading, and fake legal
 * prose in a marketing visual is exactly the kind of thing someone
 * screenshots out of context.
 */
const FRONT_LINES = ['92%', '78%', '85%', '64%', '88%', '71%']

export default function PolicyHeroVisual({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[520px] ${className}`} aria-hidden="true">
      {/* Brand-red bloom behind the stack */}
      <span className="pointer-events-none absolute left-1/2 top-1/2 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.28),transparent_68%)]" />

      <div className="relative aspect-[4/5] sm:aspect-[5/5]">
        {/* Back sheet */}
        <div className="absolute left-[14%] top-[6%] h-[76%] w-[68%] rotate-[-9deg] rounded-2xl bg-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.28)] ring-1 ring-gray-900/5" />
        {/* Middle sheet */}
        <div className="absolute left-[20%] top-[10%] h-[78%] w-[70%] rotate-[-4deg] rounded-2xl bg-white shadow-[0_20px_44px_-18px_rgba(0,0,0,0.3)] ring-1 ring-gray-900/5" />

        {/* Front sheet */}
        <div className="absolute left-[10%] top-[14%] flex h-[80%] w-[76%] rotate-[2deg] flex-col rounded-2xl bg-white p-6 shadow-[0_28px_60px_-22px_rgba(214,1,1,0.45)] ring-1 ring-gray-900/[0.07] sm:p-7">
          {/* Letterhead */}
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D60101]">
              <Scale className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block h-2 w-24 rounded-full bg-gray-900/80" />
              <span className="mt-1.5 block h-1.5 w-16 rounded-full bg-gray-300" />
            </span>
          </div>

          {/* Body — neutral bars, deliberately not readable text */}
          <div className="mt-5 space-y-2.5">
            {FRONT_LINES.map((w, i) => (
              <span
                key={i}
                className="block h-1.5 rounded-full bg-gray-200"
                style={{ width: w }}
              />
            ))}
          </div>

          {/* Signature block */}
          <div className="mt-auto flex items-end justify-between pt-5">
            <span>
              <span className="block h-1.5 w-20 rounded-full bg-gray-300" />
              <span className="mt-2 block h-px w-24 bg-gray-900/70" />
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[#D60101]/45">
              <BadgeCheck className="h-6 w-6 text-[#D60101]" strokeWidth={2} />
            </span>
          </div>
        </div>

        {/* Floating seal chip */}
        <span className="absolute bottom-[8%] right-[2%] flex items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2.5 shadow-[0_16px_36px_-14px_rgba(0,0,0,0.6)]">
          <BadgeCheck className="h-4 w-4 shrink-0 text-[#F14A4A]" strokeWidth={2.5} />
          <span className="text-xs font-semibold tracking-wide text-white">
            Plain-English terms
          </span>
        </span>
      </div>
    </div>
  )
}
