'use client'

import { Facebook, Youtube, Linkedin, Instagram, Twitter, Twitch, Music2 } from 'lucide-react'
import { TEXT_DISPLAY } from './ui/headings'
import { useLang } from '@/landing/i18n/LangProvider'

const SOCIALS = [
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Youtube, label: 'YouTube' },
  { Icon: Linkedin, label: 'LinkedIn' },
  { Icon: Music2, label: 'TikTok' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Twitch, label: 'Twitch' },
  { Icon: Twitter, label: 'Twitter / X' },
] as const

export default function FollowUs() {
  const { t } = useLang()
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-20 md:py-28 text-center">
        <h2 className={`${TEXT_DISPLAY} text-[#E94E1B] leading-none`}>{t('follow.title')}</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3 md:gap-4">
          {SOCIALS.map(({ Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-[#E94E1B] transition-colors"
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
