import { ArrowDown, Check, Cpu, LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

import { GoalComposer } from "@/components/goals/goal-composer";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { FloatingEditorialNavbar } from "@/components/navigation/floating-editorial-navbar";

const steps = [
  { number: "01", title: "Define the purpose", copy: "Tell us what your ETH needs to fund, the amount you need, and the date that matters." },
  { number: "02", title: "Compare live protection", copy: "GoalGuard checks real options data and calculates candidates against your constraints." },
  { number: "03", title: "Review before action", copy: "Three Gonka roles challenge the fit, risks, and clarity before an unsigned preview is prepared." },
] as const;

const safety = [
  "No private keys reach the server",
  "No wallet signature or transaction broadcast",
  "Canonical server records remain authoritative",
  "Unavailable services stop the journey safely",
] as const;

export default function Home() {
  return (
    <main id="top" className="min-h-screen overflow-hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <FloatingEditorialNavbar />

      <div id="main-content" tabIndex={-1}>
        <section className="page-shell pb-20 pt-32 sm:pt-36 lg:pb-28 lg:pt-40">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.12em]">Purpose-first downside protection</p>
              <h1 className="balance-text max-w-5xl font-display text-[clamp(4rem,8.5vw,8.25rem)] leading-[0.87] tracking-[-0.045em]">Protect the <em className="text-[var(--accent)]">purpose</em> behind your money.</h1>
            </div>
            <div className="flex flex-col justify-end lg:col-span-4 lg:pb-3">
              <p className="pretty-text max-w-md text-lg leading-8 text-[var(--foreground-soft)]">Describe the future your ETH needs to fund. GoalGuard finds live protection, challenges it from three perspectives, and shows you an unsigned Base preview.</p>
              <a href="#goal-composer" className="mt-7 inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--surface)]">Create a protection goal<ArrowDown className="size-4" aria-hidden="true" /></a>
            </div>
          </div>

          <div className="relative mt-14 lg:mt-20">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--border-soft)] lg:aspect-[16/7]">
              <Image src="/media/goalguard-architecture-hero.png" alt="A calm contemporary tropical courtyard in soft morning light" fill priority sizes="(max-width: 1024px) 100vw, 1328px" className="object-cover" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:absolute lg:-bottom-12 lg:right-6 lg:mt-0 lg:w-[min(72%,52rem)]">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-dark)] p-5 text-[var(--text-on-dark)] shadow-[var(--shadow-hero-module)]"><p className="text-xs uppercase tracking-[0.1em] text-[var(--text-on-dark-muted)]">Market source</p><p className="mt-2 font-display text-2xl">Live options facts</p><p className="mt-2 text-sm text-[var(--text-on-dark-muted)]">Thetanuts data, validated by GoalGuard</p></div>
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-dark)] p-5 text-[var(--text-on-dark)] shadow-[var(--shadow-hero-module)]"><p className="text-xs uppercase tracking-[0.1em] text-[var(--text-on-dark-muted)]">Independent review</p><p className="mt-2 font-display text-2xl">3 Gonka checks</p><p className="mt-2 text-sm text-[var(--text-on-dark-muted)]">Strategy, risk, and consumer clarity</p></div>
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-dark)] p-5 text-[var(--text-on-dark)] shadow-[var(--shadow-hero-module)]"><p className="text-xs uppercase tracking-[0.1em] text-[var(--text-on-dark-muted)]">P0 safety boundary</p><p className="mt-2 font-display text-2xl">Unsigned preview only</p><p className="mt-2 text-sm text-[var(--text-on-dark-muted)]">No funds moved and no position created</p></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-anchor page-shell py-24 lg:pb-36 lg:pt-44">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5"><p className="text-xs font-semibold uppercase tracking-[0.12em]">How it works</p><h2 tabIndex={-1} className="balance-text mt-5 font-display text-[clamp(3rem,5vw,4.5rem)] leading-none tracking-[-0.035em]">From human intent to a clear, reviewable plan.</h2></div>
            <div className="lg:col-span-7 lg:pt-5">{steps.map((step) => <article key={step.number} className="grid gap-4 border-t border-[var(--border)] py-7 sm:grid-cols-[4rem_1fr] sm:gap-6"><p className="text-xs font-semibold tracking-[0.1em] text-[var(--accent)]">{step.number}</p><div><h3 className="font-display text-3xl tracking-[-0.02em]">{step.title}</h3><p className="mt-3 max-w-xl text-[var(--foreground-soft)]">{step.copy}</p></div></article>)}</div>
          </div>
        </section>

        <section id="goal-composer" className="section-anchor bg-[var(--surface)] py-24 lg:py-36">
          <div className="page-shell grid gap-10 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-5"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Start with the goal</p><h2 tabIndex={-1} className="balance-text mt-5 font-display text-[clamp(3rem,5vw,4.5rem)] leading-none tracking-[-0.035em]">What future are you protecting?</h2><p className="mt-6 max-w-md text-lg leading-8 text-[var(--foreground-soft)]">Plain language is enough. We’ll turn it into a structured goal you can review before any live search begins.</p><div className="mt-8 flex items-center gap-3 border-t border-[var(--border)] pt-5 text-sm"><LockKey className="size-5" aria-hidden="true" /><span>Your session is private. Wallet connection is not required to define a goal.</span></div></div>
            <div className="lg:col-span-7 lg:pl-10"><div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] p-5 sm:p-8"><GoalComposer /></div></div>
          </div>
        </section>

        <section id="trust-safety" className="section-anchor bg-[var(--surface-dark)] py-24 text-[var(--text-on-dark)] lg:py-36">
          <div className="page-shell grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7"><div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-on-dark-muted)]"><ShieldCheck className="size-5" aria-hidden="true" />Trust & safety</div><h2 tabIndex={-1} className="balance-text mt-6 max-w-4xl font-display text-[clamp(3.2rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.04em]">AI explains. Deterministic code calculates. <em className="text-[var(--accent-bright)]">You decide.</em></h2><p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--text-on-dark-muted)]">Every stage says which source is involved, what happens next, and whether value can move. In this preview-only release, it cannot.</p></div>
            <div className="lg:col-span-5 lg:pt-10">{safety.map((item) => <div key={item} className="flex min-h-16 items-center gap-4 border-t border-[var(--dark-border)] py-4 text-sm"><Check className="size-5 shrink-0" aria-hidden="true" />{item}</div>)}</div>
          </div>
        </section>

        <section id="live-foundations" className="section-anchor page-shell py-24 lg:py-36">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5"><div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em]"><Cpu className="size-5" aria-hidden="true" />Live foundations</div><h2 tabIndex={-1} className="balance-text mt-5 font-display text-[clamp(3rem,5vw,4.5rem)] leading-none tracking-[-0.035em]">Real services. Honest availability.</h2><p className="mt-6 max-w-md text-[var(--foreground-soft)]">GoalGuard checks its configured integrations without pretending unavailable data exists. A missing service stops safely and tells you why.</p></div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 lg:col-span-7"><IntegrationStatus /></div>
          </div>
        </section>

        <footer className="border-t border-[var(--border)]"><div className="page-shell flex flex-col gap-3 py-8 text-xs text-[var(--foreground-soft)] sm:flex-row sm:items-center sm:justify-between"><p>GoalGuard · MUBA Hacks 2026</p><p>Built with Gonka, Thetanuts, and Base. Preview only.</p></div></footer>
      </div>
    </main>
  );
}
