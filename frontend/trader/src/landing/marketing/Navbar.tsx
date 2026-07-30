'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Globe, Menu, X, Download, Monitor } from 'lucide-react'
import { slugify } from './ui/slugify'
import { BRAND_LOGO, BRAND_LOGO_LIGHT } from '@/config/brand'
import { useLang } from '@/landing/i18n/LangProvider'
import { useAuthStore } from '@/stores/authStore'

/**
 * Comprehensive TuskaEx marketing Navbar, ported from the legacy
 * Swistrade Next.js site. The legacy app's `LanguageDrawer` (a
 * full-screen i18n region/language picker) was dropped — the trader
 * app does not ship i18n. The Globe button below is a static label.
 *
 * NOTE: the trader app's `(landing)/layout.tsx` already renders a
 * Navbar for marketing routes. This component is intentionally not
 * mounted there — it lives here so the entire marketing chrome is
 * preserved in code, available if a future page needs the multi-tier
 * sub-nav with the PRIVATE / PARTNERS / INSTITUTIONAL / CAREERS / GROUP
 * hover dropdowns that the legacy site shipped with.
 */

type CardAccent = 'currency' | 'metals' | 'crypto' | 'platform' | 'news' | 'pricing'
type FeaturedAccent = 'orange' | 'image' | 'plain'

export interface DropdownCardItem {
  title: string
  body: string
  accent?: CardAccent
}

export interface FeaturedItem {
  title: string
  body: string
  accent?: FeaturedAccent
}

export interface LinkGroupItem {
  title: string
  items: string[]
  extraTitle?: string
  extraItems?: string[]
}

export interface SubNavLink {
  label: string
  href: string
  active?: boolean
  cards?: DropdownCardItem[]
  featured?: FeaturedItem
  groups?: LinkGroupItem[]
}

type ActivePage = 'private' | 'partners' | 'institutional' | 'careers' | 'group' | 'markets' | 'platforms' | 'white-label' | 'about' | 'contact' | 'policy' | 'liquidity'

export interface NavbarProps {
  activePage?: ActivePage
  showCta?: boolean
  subNavLeft?: SubNavLink[] | null
  subNavRight?: SubNavLink[] | null
  /* Chrome to render. Defaults to 'light' so every existing call site keeps
     the white pill it already had. 'dark' is for pages whose hero is dark
     footage — a white slab floats on top of those and blocks the artwork. */
  theme?: 'light' | 'dark'
}

/* Per-theme class strings. Kept as one table rather than sprinkling
   ternaries through the JSX, so "what does dark mode look like" is a single
   thing to read and there is no way to theme one control and forget another.

   Dark uses the crimson #e11d48 that the cyber-samurai landing is built on,
   not the #D60101 of the light chrome. Two different reds in one viewport
   reads as a mistake, and on that page the hero sets the reference. */
const NAV_THEME = {
  light: {
    shell:
      'bg-white/55 ring-1 ring-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] supports-[backdrop-filter]:bg-white/45',
    link: 'text-gray-900',
    linkHover: 'hover:text-[#D60101]',
    linkActive: 'text-[#D60101]',
    accent: '#D60101',
    outlineBtn:
      'border-[#D60101] text-[#D60101] hover:bg-[#D60101] hover:text-white',
    loginBtn:
      'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
    /* Filled counterpart to loginBtn. Carries `border` too, so both pills
       resolve to the identical box height under border-box sizing. */
    signupBtn: 'border-[#D60101] bg-[#D60101] text-white hover:bg-[#b00101]',
    iconBtnOn: 'bg-[#D60101] text-white',
    iconBtnOff: 'text-[#D60101] hover:bg-[#D60101] hover:text-white',
    langBtn: 'text-gray-900 hover:bg-gray-100',
    panel: 'border-gray-200 bg-white',
    panelItem: 'text-gray-900 hover:bg-[#D60101]/10 hover:text-[#D60101]',
    panelMuted: 'text-gray-400',
    panelBadge: 'bg-gray-100 text-gray-400',
    divider: 'border-black/5',
    dividerStrong: 'border-gray-200',
    drawer: 'bg-white/80',
    drawerLink: 'text-gray-900/80',
    burger: 'text-gray-900',
  },
  dark: {
    shell:
      'bg-[#080a0e]/70 ring-1 ring-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-[#080a0e]/55',
    link: 'text-slate-200',
    linkHover: 'hover:text-[#e11d48]',
    linkActive: 'text-[#e11d48]',
    accent: '#e11d48',
    outlineBtn:
      'border-[#e11d48] text-[#e11d48] hover:bg-[#e11d48] hover:text-white',
    loginBtn: 'border-white/25 text-white hover:bg-white hover:text-[#080a0e]',
    signupBtn: 'border-[#e11d48] bg-[#e11d48] text-white hover:bg-[#be123c]',
    iconBtnOn: 'bg-[#e11d48] text-white',
    iconBtnOff: 'text-[#e11d48] hover:bg-[#e11d48] hover:text-white',
    langBtn: 'text-slate-200 hover:bg-white/10',
    panel: 'border-white/10 bg-[#0b0e13]',
    panelItem: 'text-slate-200 hover:bg-[#e11d48]/15 hover:text-[#e11d48]',
    panelMuted: 'text-slate-500',
    panelBadge: 'bg-white/10 text-slate-400',
    divider: 'border-white/10',
    dividerStrong: 'border-white/10',
    drawer: 'bg-[#080a0e]/90',
    drawerLink: 'text-slate-300',
    burger: 'text-slate-200',
  },
} as const

/* One geometry for every pill in the bar. Login and Sign up previously
   disagreed because Sign up went through <Button>, whose base sets
   `px-6 py-3 rounded-md`; the navbar appended `px-3.5 py-2 rounded-full`, and
   which of two conflicting Tailwind utilities wins is decided by their order
   in the generated stylesheet, not by the order in the className string. So
   the override silently lost and Sign up rendered as a taller rounded rect
   next to Login's pill. Both are plain links sharing this constant now. */
const PILL =
  'inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors'

const NAV_LINKS: { label: string; key: ActivePage; href: string; external?: boolean }[] = [
  { label: 'Platforms', key: 'platforms', href: '/platforms' },
  { label: 'Partners', key: 'partners', href: '/partners' },
  { label: 'Policy', key: 'policy', href: '/policy' },
  { label: 'About', key: 'about', href: '/about' },
  { label: 'Contact', key: 'contact', href: '/contact' },
]

/* The stock lockup is black-on-transparent, so on the dark pill its brush
   ring and "TUSKA" glyphs vanish and only the red "T" and ".EX" survive —
   the mark reads as broken fragments. The light lockup is the same artwork
   with those blacks turned white, red untouched. */
function Wordmark({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="TuskaEx home">
      <Image
        src={theme === 'dark' ? BRAND_LOGO_LIGHT : BRAND_LOGO}
        alt="TuskaEx"
        width={220}
        height={48}
        priority
        className="h-8 lg:h-9 w-auto"
      />
    </Link>
  )
}

interface DropdownCardProps {
  title: string
  body: string
  accent?: CardAccent
}

function DropdownCard({ title, body, accent = 'currency' }: DropdownCardProps) {
  return (
    <a
      href={`/${slugify(title)}`}
      className="group relative block rounded-2xl bg-gray-50 overflow-hidden p-6 h-[220px] hover:shadow-md transition-shadow"
    >
      <span className={`pointer-events-none absolute inset-0 marketing-dropdown-accent-${accent}`} />
      <h3 className="relative z-10 text-xl font-extrabold uppercase tracking-tight text-gray-900 max-w-[60%]">
        {title}
      </h3>
      <p className="absolute z-10 bottom-16 left-6 right-6 text-sm text-gray-900/80 leading-relaxed max-w-[60%]">
        {body}
      </p>
      <span className="absolute bottom-5 right-5 w-9 h-9 rounded-full border border-gray-900/40 flex items-center justify-center text-gray-900 z-10 group-hover:border-[#D60101] group-hover:text-[#D60101] transition-colors">
        <ChevronRight className="w-4 h-4" strokeWidth={2} />
      </span>
    </a>
  )
}

interface FeaturedHeroProps {
  title: string
  body: string
  accent?: FeaturedAccent
}

function FeaturedHero({ title, body, accent = 'orange' }: FeaturedHeroProps) {
  const href = `#${slugify(title)}`
  if (accent === 'image') {
    return (
      <a
        href={href}
        className="group relative block rounded-2xl overflow-hidden h-full min-h-[420px] bg-[#475a6b] text-white"
      >
        <span className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#D60101] z-20" aria-hidden="true" />
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(112,135,150,0.85) 0%, rgba(60,85,100,0.95) 50%, rgba(20,30,40,1) 100%)',
          }}
          aria-hidden="true"
        />
        <h3 className="absolute top-6 left-8 right-6 text-3xl font-extrabold uppercase tracking-tight z-10">
          {title}
        </h3>
        <div
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/55 to-transparent z-10"
          aria-hidden="true"
        />
        <p className="absolute bottom-6 left-8 right-16 text-sm font-semibold leading-snug z-10">{body}</p>
        <span className="absolute bottom-5 right-5 w-9 h-9 rounded-full border border-white/70 flex items-center justify-center text-white z-10 group-hover:bg-white group-hover:text-[#D60101] transition-colors">
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </span>
      </a>
    )
  }
  return (
    <a
      href={href}
      className={`group relative block rounded-2xl overflow-hidden p-6 h-full min-h-[420px] ${
        accent === 'orange' ? 'bg-[#D60101] text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <h3 className="text-3xl font-extrabold uppercase tracking-tight relative z-10">{title}</h3>
      <div className="absolute inset-0 marketing-featured-illustration" />
      <p className="absolute bottom-6 left-6 right-16 text-sm font-semibold leading-snug z-10">{body}</p>
      <span className="absolute bottom-5 right-5 w-9 h-9 rounded-full border border-white/70 flex items-center justify-center text-white z-10 group-hover:bg-white group-hover:text-[#D60101] transition-colors">
        <ChevronRight className="w-4 h-4" strokeWidth={2} />
      </span>
    </a>
  )
}

interface LinkGroupProps {
  title: string
  items: string[]
  extraTitle?: string
  extraItems?: string[]
}

function LinkGroup({ title, items, extraTitle, extraItems }: LinkGroupProps) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-900/40 mb-4">{title}</h4>
      <ul className="flex flex-col gap-3">
        {items.map((label) => (
          <li key={label}>
            <a
              href={`/${slugify(label)}`}
              className="text-[15px] text-gray-900 hover:text-[#D60101] transition-colors"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
      {extraTitle && extraItems && extraItems.length > 0 && (
        <>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-900/40 mt-7 mb-4">
            {extraTitle}
          </h4>
          <ul className="flex flex-col gap-3">
            {extraItems.map((label) => (
              <li key={label}>
                <a
                  href={`/${slugify(label)}`}
                  className="text-[15px] text-gray-900 hover:text-[#D60101] transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function DropdownPanel({ item }: { item: SubNavLink | undefined }) {
  if (!item) return null
  const { cards, featured, groups } = item

  if (featured || groups) {
    return (
      <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg">
        <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {featured && (
              <div className="md:col-span-4">
                <FeaturedHero title={featured.title} body={featured.body} accent={featured.accent} />
              </div>
            )}
            {groups && (
              <div
                className={`${featured ? 'md:col-span-8' : 'md:col-span-12'} grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8 ${
                  groups.length >= 5
                    ? 'lg:grid-cols-5'
                    : groups.length >= 4
                      ? 'lg:grid-cols-4'
                      : 'lg:grid-cols-3'
                }`}
              >
                {groups.map((g) => (
                  <LinkGroup
                    key={g.title}
                    title={g.title}
                    items={g.items}
                    extraTitle={g.extraTitle}
                    extraItems={g.extraItems}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!cards || !cards.length) return null
  return (
    <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-lg">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <DropdownCard key={c.title} title={c.title} body={c.body} accent={c.accent} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface SubNavItemProps {
  link: SubNavLink
  onHover: (label: string) => void
  isActive: boolean
}

function SubNavItem({ link, onHover, isActive }: SubNavItemProps) {
  const showAccent = isActive || link.active
  return (
    <li onMouseEnter={() => onHover(link.label)} className="relative">
      <a
        href={link.href}
        className={`block py-3 text-sm font-bold transition-colors ${
          showAccent ? 'text-[#D60101]' : 'text-gray-900 hover:text-[#D60101]'
        }`}
      >
        {link.label}
      </a>
    </li>
  )
}

export default function MarketingNavbar({
  activePage = 'private',
  showCta = true,
  subNavLeft = null,
  subNavRight = null,
  theme = 'light',
}: NavbarProps) {
  const c = NAV_THEME[theme]
  const [open, setOpen] = useState(false)
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)
  // Desktop-terminal download dropdown (Windows / macOS choice on click).
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false)
  const { lang, toggleLang, t } = useLang()

  // Marketing pages don't live inside an auth provider, so the store
  // starts unauthenticated even when the cookie is present. Kick off
  // loadUser() once on mount so /auth/me decides the navbar's CTA.
  // `mounted` guards against the hydration-time flash of Login/Signup
  // for users who are actually logged in.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const loadUser = useAuthStore((s) => s.loadUser)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    if (!isInitialized) void loadUser()
  }, [isInitialized, loadUser])
  const showAppLink = mounted && isAuthenticated

  const labelFor = (key: ActivePage, fallback: string) =>
    t(`nav.${key}`) === `nav.${key}` ? fallback : t(`nav.${key}`)
  const ctaLabel = activePage === 'partners' ? t('nav.partners') : t('nav.signup')
  const hasSubNav = Boolean(
    (subNavLeft && subNavLeft.length) || (subNavRight && subNavRight.length),
  )

  const allSubNav: SubNavLink[] = [...(subNavLeft ?? []), ...(subNavRight ?? [])]
  const hoveredItem = allSubNav.find((l) => l.label === hoveredLabel)
  const hasDropdown = Boolean(
    hoveredItem && (hoveredItem.cards || hoveredItem.featured || hoveredItem.groups),
  )

  return (
    <header
      data-nav-theme={theme}
      className={`sticky top-3 md:top-4 z-50 mx-3 md:mx-4 lg:mx-5 rounded-2xl backdrop-blur-2xl backdrop-saturate-150 ${c.shell}`}
    >
      <nav className="w-full mx-auto px-3 md:px-4 lg:px-5 relative flex items-center gap-3 h-16 md:h-[68px]">
        <div className="shrink-0">
          <Wordmark theme={theme} />
        </div>

        <ul className="hidden lg:flex flex-1 items-center justify-center gap-3 xl:gap-5 2xl:gap-6">
          {NAV_LINKS.map((link) => {
            const active = link.key === activePage
            const cls = `whitespace-nowrap text-[13px] 2xl:text-[14px] font-semibold tracking-tight transition-colors ${c.linkHover} ${
              active ? c.linkActive : c.link
            }`
            return (
              <li key={link.key}>
                {link.external ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {labelFor(link.key, link.label)}
                  </a>
                ) : (
                  <Link href={link.href} className={cls}>
                    {labelFor(link.key, link.label)}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>

        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 ml-auto shrink-0">
          {/* Direct Android APK download. Plain <a download> so the browser
              fetches the file straight away; on Android the OS then shows the
              install prompt (user may need "install from unknown sources"). */}
          <a
            href="/downloads/TuskaEx.apk"
            download="TuskaEx.apk"
            className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-full border text-[13px] font-semibold transition-colors ${c.outlineBtn}`}
          >
            <Download className="w-4 h-4 shrink-0" strokeWidth={2} />
            Download APK
          </a>
          {/* Desktop-terminal download: icon button opens a Windows / macOS
              picker on click. Windows ships the signed-later .exe installer;
              macOS ships a .dmg (coming soon until a Mac build is provided). */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTerminalMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={terminalMenuOpen}
              aria-label="Download Desktop Terminal"
              title="Download Desktop Terminal"
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
                theme === 'dark' ? 'border-[#e11d48]' : 'border-[#D60101]'
              } ${terminalMenuOpen ? c.iconBtnOn : c.iconBtnOff}`}
            >
              <Monitor className="w-4 h-4 shrink-0" strokeWidth={2} />
            </button>
            {terminalMenuOpen && (
              <>
                {/* click-outside backdrop */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setTerminalMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  role="menu"
                  className={`absolute right-0 top-full mt-2 z-50 w-60 rounded-xl border p-1.5 shadow-xl ${c.panel}`}
                >
                  <div className={`px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest ${c.panelMuted}`}>
                    Desktop Terminal
                  </div>
                  {/* Windows */}
                  <a
                    href="/downloads/TuskaExTerminal-Setup-1.0.1.exe"
                    download="TuskaExTerminal-Setup.exe"
                    role="menuitem"
                    onClick={() => setTerminalMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition-colors ${c.panelItem}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor" aria-hidden="true">
                      <path d="M3 5.6 10.3 4.6v6.9H3V5.6Zm0 12.8 7.3 1v-6.8H3v5.8Zm8.2 1.1L21 21V12.4h-9.8v7.1Zm0-14.9v7.1H21V3l-9.8 1.6Z" />
                    </svg>
                    Download for Windows
                  </a>
                  {/* macOS — coming soon until a Mac-built .dmg is provided */}
                  <div
                    role="menuitem"
                    aria-disabled="true"
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold cursor-not-allowed ${c.panelMuted}`}
                    title="macOS build coming soon"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor" aria-hidden="true">
                      <path d="M16.4 12.9c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.2 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.3s-2.1-.8-2.1-3.2ZM14.3 6.3c.6-.7 1-1.7.9-2.7-.8 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6.9.1 1.8-.5 2.5-1.2Z" />
                    </svg>
                    <span className="flex-1">Download for macOS</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${c.panelBadge}`}>Soon</span>
                  </div>
                </div>
              </>
            )}
          </div>
          {showCta && (showAppLink ? (
            <Link
              href="/dashboard"
              className={`${PILL} ${c.signupBtn}`}
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                href="/auth/portal"
                className={`${PILL} ${c.loginBtn}`}
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/auth/register"
                className={`${PILL} ${c.signupBtn}`}
              >
                {ctaLabel}
              </Link>
            </>
          ))}
          <button
            type="button"
            onClick={toggleLang}
            className={`inline-flex items-center gap-1 text-[13px] px-2 py-1 rounded-full transition-colors ${c.langBtn}`}
            aria-label={`Switch language to ${lang === 'ja' ? 'English' : 'Japanese'}`}
            title={`Switch language to ${lang === 'ja' ? 'English' : 'Japanese'}`}
          >
            <Globe className="w-4 h-4" style={{ color: c.accent }} strokeWidth={2} />
            <span className="font-semibold uppercase">{lang === 'ja' ? 'JA' : 'EN'}</span>
          </button>
        </div>

        <button
          type="button"
          className={`lg:hidden ml-auto p-2 -mr-2 ${c.burger}`}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {hasSubNav && (
        <div
          className={`hidden lg:block border-t relative ${c.divider}`}
          onMouseLeave={() => setHoveredLabel(null)}
        >
          <div className="w-full mx-auto px-5 md:px-8 lg:px-10 flex items-center justify-between h-11">
            <ul className="flex items-center gap-8">
              {(subNavLeft ?? []).map((link) => (
                <SubNavItem
                  key={link.label}
                  link={link}
                  onHover={setHoveredLabel}
                  isActive={hoveredLabel === link.label}
                />
              ))}
            </ul>
            <ul className="flex items-center gap-8">
              {(subNavRight ?? []).map((link) => (
                <SubNavItem
                  key={link.label}
                  link={link}
                  onHover={setHoveredLabel}
                  isActive={hoveredLabel === link.label}
                />
              ))}
            </ul>
          </div>

          {hasDropdown && <DropdownPanel item={hoveredItem} />}
        </div>
      )}

      {open && (
        <div className={`lg:hidden border-t rounded-b-2xl backdrop-blur-2xl backdrop-saturate-150 ${c.divider} ${c.drawer}`}>
          <ul className="w-full mx-auto px-6 md:px-10 lg:px-16 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((link) => {
              const active = link.key === activePage
              const cls = `block text-sm font-semibold py-1 ${
                active ? c.linkActive : c.drawerLink
              }`
              return (
                <li key={link.key}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                      onClick={() => setOpen(false)}
                    >
                      {labelFor(link.key, link.label)}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className={cls}
                      onClick={() => setOpen(false)}
                    >
                      {labelFor(link.key, link.label)}
                    </Link>
                  )}
                </li>
              )
            })}
            {hasSubNav && (
              <li className={`pt-3 mt-1 border-t ${c.dividerStrong}`}>
                <ul className="flex flex-col gap-2">
                  {allSubNav.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className={`block text-sm py-1 ${c.drawerLink}`}
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            )}
            <li className={`pt-3 border-t ${c.dividerStrong}`}>
              <a
                href="/downloads/TuskaEx.apk"
                download="TuskaEx.apk"
                onClick={() => setOpen(false)}
                className={`inline-flex w-full items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${c.outlineBtn}`}
              >
                <Download className="w-4 h-4" strokeWidth={2} />
                Download APK
              </a>
            </li>
            <li>
              <a
                href="/downloads/TuskaExTerminal-Setup-1.0.1.exe"
                download="TuskaExTerminal-Setup.exe"
                onClick={() => setOpen(false)}
                className={`inline-flex w-full items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${c.outlineBtn}`}
              >
                <Monitor className="w-4 h-4" strokeWidth={2} />
                Terminal for Windows
              </a>
            </li>
            <li>
              <span
                aria-disabled="true"
                title="macOS build coming soon"
                className={`inline-flex w-full items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border text-sm font-semibold cursor-not-allowed ${c.dividerStrong} ${c.panelMuted}`}
              >
                <Monitor className="w-4 h-4" strokeWidth={2} />
                Terminal for macOS
                <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${c.panelBadge}`}>Soon</span>
              </span>
            </li>
            {showCta && (
              <li className={`flex items-center gap-3 pt-3 border-t ${c.dividerStrong}`}>
                {showAppLink ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`${PILL} ${c.signupBtn}`}
                  >
                    Open App
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/portal"
                      onClick={() => setOpen(false)}
                      className={`${PILL} ${c.loginBtn}`}
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      href="/auth/register"
                      onClick={() => setOpen(false)}
                      className={`${PILL} ${c.signupBtn}`}
                    >
                      {ctaLabel}
                    </Link>
                  </>
                )}
              </li>
            )}
          </ul>
        </div>
      )}

      <style>{`
        .marketing-dropdown-accent-currency {
          background:
            radial-gradient(circle at 78% 60%, rgba(214,1,1,0.18) 0, transparent 35%),
            radial-gradient(circle at 88% 30%, rgba(30,80,200,0.18) 0, transparent 30%),
            radial-gradient(circle at 70% 80%, rgba(199,62,17,0.18) 0, transparent 30%);
        }
        .marketing-dropdown-accent-metals {
          background:
            radial-gradient(circle at 80% 55%, rgba(212,175,55,0.35) 0, transparent 38%),
            radial-gradient(circle at 90% 80%, rgba(180,180,180,0.45) 0, transparent 32%);
        }
        .marketing-dropdown-accent-crypto {
          background:
            radial-gradient(circle at 75% 45%, rgba(214,1,1,0.30) 0, transparent 32%),
            radial-gradient(circle at 90% 75%, rgba(212,175,55,0.30) 0, transparent 30%),
            radial-gradient(circle at 70% 75%, rgba(30,80,200,0.18) 0, transparent 28%);
        }
        .marketing-dropdown-accent-platform {
          background:
            radial-gradient(circle at 85% 60%, rgba(30,80,200,0.22) 0, transparent 38%),
            radial-gradient(circle at 75% 30%, rgba(80,80,80,0.18) 0, transparent 30%);
        }
        .marketing-dropdown-accent-news {
          background:
            radial-gradient(circle at 80% 55%, rgba(214,1,1,0.22) 0, transparent 36%);
        }
        .marketing-dropdown-accent-pricing {
          background:
            radial-gradient(circle at 80% 60%, rgba(0,150,80,0.22) 0, transparent 36%);
        }
        .marketing-featured-illustration {
          background:
            radial-gradient(circle at 60% 55%, rgba(255,255,255,0.45) 0, rgba(255,255,255,0) 28%),
            radial-gradient(circle at 30% 40%, rgba(255,255,255,0.18) 0, transparent 32%),
            radial-gradient(circle at 75% 70%, rgba(0,0,0,0.10) 0, transparent 30%);
          pointer-events: none;
        }
      `}</style>
    </header>
  )
}
