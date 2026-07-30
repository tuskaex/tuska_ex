'use client';

/**
 * Public marketing page — How It Works.
 * Copy adapted from DETAILED_CONTENT_HOW_IT_WORKS_PAGE.docx (May 2026 client deck).
 */
import Link from 'next/link';
import { Wallet, ShieldCheck, Cpu, ArrowRight, Check, Zap, ChevronRight, Plus } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden" style={{ background: 'var(--mkt-bg-canvas)' }}>
      <div className="fx-grid-bg" aria-hidden="true" />
      <div className="fx-glow-gold" aria-hidden="true" />

      {/* Hero */}
      <section className="fx-container relative z-10 pt-28 md:pt-36 pb-16">
        <p className="text-xs uppercase tracking-[0.25em] text-[#E94E1B]/85 mb-3">How TuskaEx Works</p>
        <h1 className="fx-headline text-[40px] sm:text-[52px] md:text-[64px] xl:text-[72px] leading-tight max-w-4xl">
          Not a Broker.
          <br />
          <span className="fx-gold-text">A Trading Protocol.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: 'var(--mkt-ink-secondary)' }}>
          TuskaEx does not hold your funds. Your trades operate through a
          structured smart contract system. Execution is automated. Control
          stays with you.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="#flow" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#E94E1B] text-white font-bold text-sm hover:brightness-110">
            See the Flow <ArrowRight size={14} />
          </Link>
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#E94E1B]/40 text-text-primary text-sm hover:border-[#E94E1B]/70">
            Start Trading
          </Link>
        </div>
      </section>

      {/* Broker vs Protocol */}
      <section className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--mkt-ink-primary)' }}>
          Traditional Broker vs TuskaEx
        </h2>
        <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--mkt-ink-secondary)' }}>
          We don&apos;t hold your money. The system manages execution.
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          <Card title="Traditional Brokers" tone="warn" items={[
            'Funds deposited into broker accounts',
            'Withdrawal depends on approvals',
            'Execution lacks transparency',
            'Manual intervention possible',
          ]} />
          <Card title="TuskaEx Protocol" tone="ok" items={[
            'Funds interact with smart contract layer',
            'No custody held by platform',
            'Trades execute via system logic',
            'Automatic P&L settlement',
          ]} />
        </div>
      </section>

      {/* 7-step flow */}
      <section id="flow" className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--mkt-ink-primary)' }}>
          From Wallet to Trade — Step by Step
        </h2>
        <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--mkt-ink-secondary)' }}>
          Every step is system-driven. No manual control involved.
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-[#E94E1B]/20 p-5 bg-[rgba(255,255,255,0.02)]">
              <div className="flex items-center gap-2 text-xs text-[#E94E1B]/85 mb-2">
                <span className="font-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="uppercase tracking-wider">{s.eyebrow}</span>
              </div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--mkt-ink-primary)' }}>{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mkt-ink-secondary)' }}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Visual flow — wallet → CRM → account → contract → engine → result → wallet */}
      <section className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--mkt-ink-primary)' }}>
          How Funds Move Inside the System
        </h2>
        <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--mkt-ink-secondary)' }}>
          Funds move only based on trading outcomes.
        </p>
        <div className="rounded-2xl border border-[#E94E1B]/20 p-6 md:p-10 bg-[rgba(233,78,27,0.03)]">
          <ol className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {FLOW_NODES.map((node, i) => (
              <li key={node} className="flex items-center gap-2 md:gap-3">
                <span className="inline-flex items-center justify-center rounded-full border border-[#E94E1B]/40 bg-[rgba(233,78,27,0.08)] px-3 md:px-4 py-2 text-[11px] md:text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--mkt-ink-primary)' }}>
                  {node}
                </span>
                {i < FLOW_NODES.length - 1 && (
                  <ChevronRight size={16} className="text-[#E94E1B] shrink-0" aria-hidden />
                )}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-[11px] md:text-xs uppercase tracking-[0.25em] text-[#E94E1B]/85">
            One direction · System decides
          </p>
        </div>
      </section>

      {/* Security pillars */}
      <section className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--mkt-ink-primary)' }}>
          Built for Transparency and Control
        </h2>
        <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--mkt-ink-secondary)' }}>
          Designed to minimize trust dependency and maximize system-based execution.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          <Pillar icon={Wallet} title="No Custody" body="Funds never sit in a broker account. They interact with the contract layer only when you trade." />
          <Pillar icon={Cpu} title="Automated Execution" body="Trades are settled by the system on outcome — no manual approvals, no withdrawal delays." />
          <Pillar icon={ShieldCheck} title="Transparent Flow" body="Every step is observable: wallet → contract → engine → outcome → wallet." />
        </div>
      </section>

      {/* Comparison table */}
      <section className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--mkt-ink-primary)' }}>
          TuskaEx vs Traditional Brokers
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#E94E1B]/20">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-[#E94E1B]/90">
              <tr>
                <th className="text-left px-4 py-3 bg-[rgba(233,78,27,0.06)]">Feature</th>
                <th className="text-left px-4 py-3 bg-[rgba(233,78,27,0.06)]">TuskaEx</th>
                <th className="text-left px-4 py-3 bg-[rgba(233,78,27,0.06)]">Traditional Broker</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r[0]} className="border-t border-[#E94E1B]/10">
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--mkt-ink-primary)' }}>{r[0]}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--mkt-ink-secondary)' }}>{r[1]}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--mkt-ink-secondary)' }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ — trust questions */}
      <section className="fx-container relative z-10 py-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--mkt-ink-primary)' }}>
          Common Questions
        </h2>
        <p className="text-sm mb-10 max-w-2xl" style={{ color: 'var(--mkt-ink-secondary)' }}>
          Direct answers on custody, withdrawals, and execution.
        </p>
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-[#E94E1B]/20 bg-[rgba(255,255,255,0.02)] open:border-[#E94E1B]/45 open:bg-[rgba(233,78,27,0.04)] transition-colors"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                <span className="text-sm md:text-base font-semibold" style={{ color: 'var(--mkt-ink-primary)' }}>
                  {f.q}
                </span>
                <Plus size={18} className="text-[#E94E1B] shrink-0 transition-transform duration-200 group-open:rotate-45" aria-hidden />
              </summary>
              <div className="px-5 pb-5 -mt-1 text-sm leading-relaxed" style={{ color: 'var(--mkt-ink-secondary)' }}>
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="fx-container relative z-10 py-20">
        <div className="rounded-2xl border border-[#E94E1B]/30 p-10 md:p-14 text-center bg-[rgba(233,78,27,0.04)]">
          <Zap size={28} className="text-[#E94E1B] mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--mkt-ink-primary)' }}>
            Experience System-Driven Trading
          </h2>
          <p className="text-sm md:text-base max-w-xl mx-auto mb-6" style={{ color: 'var(--mkt-ink-secondary)' }}>
            No custody. No hidden control. Just structured execution.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#E94E1B] text-white font-bold text-sm hover:brightness-110">
              Start Trading <ArrowRight size={14} />
            </Link>
            <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#E94E1B]/40 text-text-primary text-sm hover:border-[#E94E1B]/70">
              Connect Wallet
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const STEPS = [
  { eyebrow: 'Step', title: 'Connect Wallet', body: 'Securely connect your wallet to access the platform.' },
  { eyebrow: 'Step', title: 'Access Your Dashboard', body: 'Manage your profile, settings, and activity through your CRM.' },
  { eyebrow: 'Step', title: 'Create Trading Account', body: 'Choose TuskaEx native or an external integration.' },
  { eyebrow: 'Step', title: 'Allocate Funds to Contract', body: 'Funds move into a secure smart contract layer, not a broker.' },
  { eyebrow: 'Step', title: 'Execute Trades', body: 'Trade normally using your selected account.' },
  { eyebrow: 'Step', title: 'Automatic P&L Settlement', body: 'Profits credit, losses deduct — automatically.' },
  { eyebrow: 'Step', title: 'Withdraw Anytime', body: 'Funds settle directly back to your wallet.' },
];

const COMPARE: Array<[string, string, string]> = [
  ['Fund Custody', 'Smart Contract Layer', 'Broker Holds Funds'],
  ['Withdrawals', 'System-Based', 'Approval-Based'],
  ['Execution', 'Automated Logic', 'Broker-Controlled'],
  ['Transparency', 'Structured Flow', 'Limited Visibility'],
  ['User Control', 'High', 'Limited'],
];

const FLOW_NODES = [
  'Wallet',
  'CRM',
  'Trading Account',
  'Smart Contract',
  'Trade Engine',
  'Result',
  'Wallet',
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Does TuskaEx hold my funds?',
    a: 'No. Funds are allocated to a system-controlled contract environment — the platform does not custody trader balances directly.',
  },
  {
    q: 'Can withdrawals be delayed?',
    a: 'Withdrawals follow system rules and are not manually controlled. Once a withdrawal qualifies under the protocol logic, settlement returns to your wallet on the next on-chain cycle.',
  },
  {
    q: 'Who controls trade execution?',
    a: 'Execution is based on predefined system logic. The engine fills orders against live market data; no human dealer sits between the trader and the fill.',
  },
  {
    q: 'Is this a decentralized system?',
    a: 'It is a structured protocol combining smart-contract custody with a centralized matching engine. The custody layer is on-chain; the matching layer is off-chain for latency.',
  },
  {
    q: 'What happens if I make profit?',
    a: 'Profit is automatically credited to your trading balance based on the closing price and lot size. Withdrawal back to your wallet is on-demand from there.',
  },
  {
    q: 'What happens if I incur loss?',
    a: 'Loss is automatically deducted from the position’s margin pool at close, just like any standard derivatives platform. Stop-loss orders enforce the deduction at your chosen threshold.',
  },
];

function Card({
  title, items, tone,
}: { title: string; items: string[]; tone: 'ok' | 'warn' }) {
  const accent = tone === 'ok' ? '#22c55e' : '#f87171';
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: `${accent}33`, background: `${accent}0a` }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: accent }}>{title}</h3>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-sm" style={{ color: 'var(--mkt-ink-secondary)' }}>
            <Check size={14} className="mt-0.5 shrink-0" style={{ color: accent }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#E94E1B]/20 p-6 bg-[rgba(255,255,255,0.02)]">
      <Icon size={24} className="text-[#E94E1B] mb-3" />
      <h3 className="font-semibold mb-1.5" style={{ color: 'var(--mkt-ink-primary)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--mkt-ink-secondary)' }}>{body}</p>
    </div>
  );
}
