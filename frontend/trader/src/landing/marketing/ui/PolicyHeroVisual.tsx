import Image from 'next/image'
import { BadgeCheck } from 'lucide-react'

/**
 * Hero visual for the /policy page — the right half of the two-column hero.
 *
 * That column used to be empty, showing nothing but a flat orange background
 * bitmap. It was filled with a drawn stack of documents, and now carries real
 * artwork: an arcade cabinet reading GAMES, which is the visual half of the
 * heading beside it — "Clear rules. No fine-print games."
 *
 * The drawn sheets are gone rather than kept behind the photo: two
 * illustrations in one column compete, and the stack was standing in for
 * exactly the artwork that now exists.
 *
 * The seal chip stays. It is the one element here that makes a claim about the
 * documents rather than decorating them, so it is real content and is not
 * hidden from assistive tech.
 */
export default function PolicyHeroVisual({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[520px] ${className}`}>
      {/* Brand-red bloom behind the artwork */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(214,1,1,0.28),transparent_68%)]"
      />

      {/* 4/5 is close to the source's own 1154x1363, so object-cover trims only
          a sliver. The square this used to become at sm+ would have cut into
          the cabinet. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-[0_28px_60px_-24px_rgba(0,0,0,0.55)]">
        <Image
          src="/marketing/games_banner.png"
          alt="A retro arcade cabinet with GAMES on its screen"
          fill
          sizes="(max-width: 1024px) 100vw, 520px"
          className="object-cover"
        />
      </div>

      {/* Floating seal chip */}
      <span className="absolute bottom-[8%] right-[2%] flex items-center gap-2 rounded-full bg-[#0A0A0A] px-4 py-2.5 shadow-[0_16px_36px_-14px_rgba(0,0,0,0.6)]">
        <BadgeCheck className="h-4 w-4 shrink-0 text-[#F14A4A]" strokeWidth={2.5} />
        <span className="text-xs font-semibold tracking-wide text-white">
          Plain-English terms
        </span>
      </span>
    </div>
  )
}
