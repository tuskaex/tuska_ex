export type Lang = 'ja' | 'en'

export const LANG_STORAGE_KEY = 'tuskaex-lang'

type DictNode = string | { [key: string]: DictNode }

/* `ja` is deliberately PARTIAL. Every lookup falls back to `en` when a key
   is missing (see LangProvider.t), so the Japanese column only carries the
   strings that were translated deliberately: navigation, buttons and other
   short UI labels.

   The long marketing prose is intentionally NOT here. Machine-translating a
   broker's copy — spreads, custody, risk and regulatory wording — produces
   text that reads fluent and states things the business has not agreed to.
   Those keys stay English until a human translator supplies them; add them
   to this block as they arrive and they will start resolving automatically. */
interface Dict {
  ja: Record<string, DictNode>
  en: Record<string, DictNode>
}

export const dict: Dict = {
  ja: {
    nav: {
      markets: '市場',
      platforms: 'プラットフォーム',
      partners: 'パートナー',
      policy: 'ポリシー',
      about: '会社概要',
      contact: 'お問い合わせ',
      login: 'ログイン',
      signup: '新規登録',
      lang: 'JA',
    },
    hero: {
      ctaOpen: '口座を開設',
      ctaDemo: 'デモを試す',
    },
  },
  en: {
    nav: {
      markets: 'Markets',
      platforms: 'Platforms',
      partners: 'Partners',
      policy: 'Policy',
      about: 'About',
      contact: 'Contact',
      login: 'Login',
      signup: 'Sign up',
      lang: 'EN',
    },
    hero: {
      eyebrow: 'Precision-Engineered Trading',
      headlineA: 'Your edge.',
      headlineB: 'Every market.',
      headlineC: 'Zero compromise.',
      sub: 'Trade 200+ forex pairs and top crypto assets with razor-thin spreads, lightning execution, and the security of institutional-grade infrastructure — all from one powerful platform.',
      ctaOpen: 'Open your account',
      ctaDemo: 'Try a demo',
    },
    bank: {
      titleA: 'TuskaEx Banking,',
      titleB: 'Unbanked.',
      lead: 'Your money deserves more than a dusty vault. TuskaEx brings you the precision of institutional banking fused with the speed of modern trading — no suits required, no hidden fees tolerated.',
      sub: 'Trade Forex. Hold Crypto. Own Securities. All from one account, backed by institutional-grade custody and built for people who actually want to understand their money.',
      eyebrow: 'What you can trade',
      cards: {
        metals: { title: 'Precious Metals', body: 'Gold, silver, and the assets that outlast every headline.' },
        currency: { title: 'Currency Pairs', body: 'The global FX market at your fingertips. Tight spreads. Clean execution.' },
        cfds: { title: 'CFDs', body: 'Go long, go short, go wherever the market takes you.' },
      },
      explore: 'Explore',
    },
    platforms: {
      eyebrow: 'Platforms',
      titleA: 'Platforms that',
      titleB: 'don’t get in your way',
      lead1: 'World-class tools. Zero learning curve drama. Spreads from',
      lead2: '1.1 pips',
      pick: 'Choose your weapon',
      explore: 'Explore',
    },
    pricing: {
      from: 'Spreads from',
      pips: 'pips',
      eyebrow: 'Pricing',
      titleA: 'Pricing that',
      titleB: 'won’t make you flinch',
      lead: 'No mystery charges. No fine-print surprises. Just honest, competitive pricing that lets you keep more of what you earn.',
      sub: 'Check our Forex trading conditions, account types, and execution policies — everything is out in the open.',
      cards: {
        c1: { t: 'Forex Trading Conditions', b: 'Tight spreads, deep liquidity, predictable execution.' },
        c2: { t: 'Account Types', b: 'From first trade to institutional flow — pick your tier.' },
        c3: { t: 'Execution', b: 'Lightning fills, transparent fees, zero surprises.' },
      },
      explore: 'Explore',
    },
    securities: {
      eyebrow: 'Securities',
      titleA: 'The full arsenal for a',
      titleB: 'portfolio that works',
      lead: 'Stocks, ETFs, bonds, options, futures, derivatives. Every keystone of the trading realm — within reach for a portfolio that works as hard as you do.',
      regulated: '',
      explore: 'Explore',
    },
    crypto: {
      eyebrow: 'Crypto',
      titleA: '52 cryptos.',
      titleB: 'Institutional-grade security.',
      lead: '52 cryptocurrencies on our own TuskaEx exchange. From Bitcoin to the ones your cousin hasn’t heard of yet. Trade 24/7 with institutional-grade security.',
      regulated: '',
      explore: 'Explore',
    },
    steps: {
      titleA: 'Open an account in',
      titleB: '3 steps',
      cta: 'Open your account',
      s1: { t: 'Pick your platform and fill in the application', d: 'Takes minutes, not meetings. Choose from CFXD, TradingView, MetaTrader 4 or MetaTrader 5.', tag: 'Quick application' },
      s2: { t: 'Upload your ID and proof of residence', d: 'Passport or national ID, plus a proof of residence dated within the last 6 months.', tag: 'Verified & secure' },
      s3: { t: 'Fund your account and start trading', d: 'That’s it. No hoops, no waiting rooms.', tag: 'Start trading' },
    },
    about: {
      eyebrow: 'Who we are',
      titleA: 'Built for transparency.',
      titleB: 'Zero stuffiness.',
      lead: 'We reverse-engineered the banking system so you don’t have to fight it. TuskaEx gives you institutional-grade stability with the agility of a fintech — because the two were never meant to be enemies.',
      learnMore: 'Learn more',
    },
    follow: {
      title: 'Follow us',
    },
    footerLinks: {
      eyebrow: 'Get in touch',
      lead: 'Real humans, real help. Answers before you need to ask.',
      cols: {
        client: { h: 'Become a client', l1: 'Open your account', l2: 'Refer a friend (Forex)' },
        partner: { h: 'Become a partner', l1: 'Forex Partnerships' },
        help: { h: 'Help & Support', l1: 'Help Centre', l2: 'Customer Care' },
      },
    },
    disclaimer: {
      title: 'Risk Disclosure',
      p1: 'Trading leveraged products — including foreign exchange, spot precious metals, and Contracts for Difference (CFDs) — carries a significant risk of loss. Leverage amplifies both gains and losses, and this type of trading may not be suitable for all investors. You could lose more than your initial deposit, and you may be required to make additional payments if your account balance falls below the required margin. Open leveraged positions also incur rolling, financing, and other applicable fees.',
      p2: 'Before opening an account with TuskaEx, carefully assess your level of experience, investment objectives, financial resources, income, and personal risk tolerance. Losses can theoretically be unlimited. Past performance is not indicative of future results. Market data displayed on this site is provided for informational purposes only, sourced from third parties believed to be reliable; TuskaEx does not guarantee its accuracy and reserves the right to delay or interrupt data delivery without prior notice. Position closures are executed as market orders at the prevailing bid or ask price; slippage may occur, particularly during periods of high volatility.',
      p3: 'If you are unsure whether leveraged trading is appropriate for your situation, please consult an independent financial adviser before proceeding. For full details on leverage, fees, margin requirements, and trading costs, refer to our official documentation.',
      p4: '',
      hq: 'Headquarters:',
      hqAddr: 'Rue de la Tour-de-l’Île 4, 1204 Genève',
      copyright: '© 2026 TuskaEx. All rights reserved.',
      links: {
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        risk: 'Risk Disclosure',
        vuln: 'Vulnerability Disclosure',
      },
    },
  },
}
