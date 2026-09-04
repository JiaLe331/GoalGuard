import {
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  CirclesThree,
  Database,
  Eye,
  LockKey,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { NiulaiMark, NiulaiMascot } from "@/components/brand/niulai-mascot";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { GoalPreview } from "@/components/marketing/goal-preview";
import { ProtectionOrbit } from "@/components/marketing/protection-orbit";
import { FloatingEditorialNavbar } from "@/components/navigation/floating-editorial-navbar";

const advantages = [
  {
    icon: Eye,
    title: "See the trade-off before the transaction",
    copy: "Cost, estimated floor, coverage, expiry, and deadline gap are presented together before an unsigned preview is generated.",
  },
  {
    icon: Brain,
    title: "Three checks, with different jobs",
    copy: "A strategist, risk auditor, and consumer advocate review the same deterministic facts and disclose their reasoning.",
  },
  {
    icon: Database,
    title: "Live facts stay attributable",
    copy: "Market timestamps, wallet-read balances, council request IDs, and preview metadata remain visible and copyable.",
  },
  {
    icon: LockKey,
    title: "Preview without surrendering control",
    copy: "P0 never requests a wallet signature, broadcasts a transaction, or creates a protected position.",
  },
] as const;

function HowItWorksIllustration({ variant }: { variant: "goal" | "review" }) {
  if (variant === "goal") {
    return (
      <div className="relative min-h-48 overflow-hidden" aria-hidden="true">
        <div className="absolute -bottom-20 right-4 h-64 w-28 rotate-12 rounded-full bg-[var(--surface-strong)]" />
        <div className="absolute -bottom-12 right-[-2rem] h-44 w-36 rounded-[2.5rem] bg-[var(--accent)] opacity-90" />
        <svg className="absolute bottom-8 right-0 h-16 w-28" viewBox="0 0 120 70" fill="none"><path d="M2 45c18-18 34-18 48-5 15 15 36 15 68-9" stroke="currentColor" strokeWidth="2" /></svg>
      </div>
    );
  }
  return (
    <div className="relative grid min-h-48 place-items-end overflow-hidden" aria-hidden="true">
      <div className="absolute -bottom-8 right-0 size-48 rounded-full bg-[var(--accent-soft)]" />
      <NiulaiMascot pose="explaining" size="lg" className="relative -bottom-3 -right-2 h-56 w-64" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <FloatingEditorialNavbar />

      <main id="main-content" tabIndex={-1} className="min-h-screen outline-none">
        <section id="top" className="page-shell pb-16 pt-4 sm:pb-20 sm:pt-6 min-[1200px]:pb-28">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-[var(--hero-bg)] px-4 py-7 text-[color:var(--hero-fg)] sm:rounded-[var(--radius-section)] sm:px-8 sm:py-10 min-[1200px]:px-16 min-[1200px]:py-16 min-[1440px]:px-20">
            <div className="absolute -left-32 -top-36 size-96 rounded-full border-[5rem] border-[color-mix(in_srgb,var(--white)_26%,transparent)]" aria-hidden="true" />
            <div className="relative z-10 grid gap-8 sm:gap-10 min-[1200px]:grid-cols-12 min-[1200px]:gap-8">
              <div className="flex min-w-0 flex-col min-[1200px]:col-span-7 min-[1200px]:pt-2">
                <p className="section-eyebrow">Purpose-first ETH protection</p>
                <h1 className="display-heading mt-6 max-w-[8.5ch]">Protect the purpose behind your money.</h1>
                <p className="pretty-text mt-7 max-w-xl text-lg leading-8 sm:text-xl">Turn a real-life goal into a live, independently reviewed downside-protection plan. Then inspect the exact Base transaction data without signing anything.</p>
                <a href="#how-it-works" className="mt-8 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[var(--surface-strong)] px-6 text-sm font-semibold text-[color:var(--foreground-on-strong)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--surface-strong-raised)] active:scale-[0.98]">See how protection works<ArrowDown className="size-4" aria-hidden="true" /></a>
              </div>

              <div id="goal-preview" className="relative z-20 mx-auto w-full max-w-3xl min-[1200px]:col-span-5 min-[1200px]:row-span-2 min-[1200px]:max-w-none min-[1200px]:pl-3">
                <div className="rounded-[1.5rem] bg-[var(--surface-raised)] p-5 text-[color:var(--foreground)] shadow-[var(--shadow-float-strong)] sm:rounded-[1.75rem] sm:p-7 min-[1200px]:sticky min-[1200px]:top-28">
                  <GoalPreview />
                </div>
              </div>

              <div className="min-w-0 min-[1200px]:col-span-7"><ProtectionOrbit /></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section-anchor reading-shell py-24 lg:py-36">
          <div className="max-w-4xl">
            <p className="section-eyebrow">How it works</p>
            <h2 tabIndex={-1} className="section-heading mt-5 outline-none">From your goal to a plan you can actually inspect.</h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="grid min-h-[22rem] overflow-hidden rounded-[var(--radius-feature)] bg-[var(--feature-card-bg)] p-7 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-10">
              <div className="flex flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">01 · Define</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Make the purpose measurable</h3>
                <p className="mt-4 max-w-md text-[color:var(--foreground-soft)]">Confirm the amount, deadline, acceptable loss, and maximum cost. Nothing reaches the market until those guardrails are clear.</p>
                <Link href="/goals/new" className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 pt-6 text-sm font-semibold underline-offset-4 hover:underline">Start with your goal<ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
              <HowItWorksIllustration variant="goal" />
            </article>

            <article className="grid min-h-[22rem] overflow-hidden rounded-[var(--radius-feature)] bg-[var(--feature-card-bg)] p-7 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-10">
              <div className="flex flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">02–03 · Compare and review</p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Live facts, challenged three ways</h3>
                <p className="mt-4 max-w-md text-[color:var(--foreground-soft)]">GoalGuard compares live options, then independent AI reviewers challenge suitability, risk, and consumer clarity without altering the calculations.</p>
                <a href="#trust-safety" className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 pt-6 text-sm font-semibold underline-offset-4 hover:underline">Why the review matters<ArrowRight className="size-4" aria-hidden="true" /></a>
              </div>
              <HowItWorksIllustration variant="review" />
            </article>
          </div>
        </section>

        <section id="trust-safety" className="section-anchor reading-shell py-24 lg:py-36">
          <div className="max-w-3xl">
            <p className="section-eyebrow">Trust & safety</p>
            <h2 tabIndex={-1} className="section-heading mt-5 outline-none">Clear advantages without hidden custody.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--foreground-soft)]">The interface stays familiar while every Web3-specific assumption is disclosed in plain language.</p>
          </div>

          <div className="mt-16 grid gap-x-14 gap-y-14 lg:grid-cols-2 lg:gap-y-20">
            {advantages.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="grid grid-cols-[4rem_1fr] gap-5">
                  <div className="grid size-14 place-items-center rounded-full bg-[var(--accent-soft)]"><Icon className="size-6" aria-hidden="true" /></div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.035em]">{item.title}</h3>
                    <p className="mt-3 max-w-xl leading-7 text-[color:var(--foreground-soft)]">{item.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="live-foundations" className="section-anchor page-shell py-24 text-center lg:py-36">
          <div className="mx-auto max-w-2xl">
            <p className="section-eyebrow justify-center"><CirclesThree className="size-4" aria-hidden="true" />Live foundations</p>
            <h2 tabIndex={-1} className="section-heading mt-5 outline-none">Real services. Honest availability.</h2>
            <p className="mt-5 text-lg leading-8 text-[color:var(--foreground-soft)]">The configured AI provider, Thetanuts, Base, and GoalGuard’s data layer are checked directly. Missing configuration never becomes invented data.</p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl rounded-[var(--radius-feature)] bg-[var(--surface-subtle)] p-6 text-left sm:p-9"><IntegrationStatus /></div>
        </section>

        <section className="reading-shell py-24 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="section-eyebrow">Designed around the decision</p>
              <h2 className="section-heading mt-5">Your purpose stays attached to every number.</h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[color:var(--foreground-soft)]">A protection option is only useful when its cost, coverage, and expiry still make sense for the thing the money is meant to fund. GoalGuard keeps that context present from the first message to the final preview.</p>
              <p className="mt-5 max-w-xl leading-7 text-[color:var(--foreground-soft)]">If live facts change, the journey stops and asks you to review again. It never silently carries stale approval forward.</p>
            </div>

            <div className="relative min-h-[30rem] overflow-hidden rounded-[var(--radius-feature)] bg-[var(--surface-subtle)]" aria-label="GoalGuard keeps purpose, option, and review information connected">
              <div className="absolute -bottom-20 -right-16 size-[26rem] rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <div className="absolute left-7 top-9 rounded-2xl bg-[var(--surface-raised)] px-5 py-4 shadow-[var(--shadow-float)] sm:left-12 sm:top-14">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Purpose</p>
                <p className="mt-1 font-semibold">Your real-world deadline</p>
              </div>
              <div className="absolute right-5 top-[38%] w-[72%] rounded-2xl bg-[var(--surface-raised)] px-5 py-4 shadow-[var(--shadow-float)] sm:right-9 sm:w-[64%]">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Live option</p>
                <p className="mt-1 font-semibold">Cost · floor · coverage · expiry</p>
              </div>
              <div className="absolute bottom-8 left-5 w-[76%] rounded-2xl bg-[var(--surface-strong)] px-5 py-5 text-[color:var(--foreground-on-strong)] shadow-[var(--shadow-float-strong)] sm:bottom-12 sm:left-10 sm:w-[66%]">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-on-strong-muted)]">Unsigned preview</p>
                <p className="mt-2 text-xl font-medium tracking-[-0.04em]">Exact data. No funds moved.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-20 lg:py-28">
          <div className="relative overflow-hidden rounded-[2.25rem] bg-[var(--surface-strong)] px-7 py-14 text-[color:var(--foreground-on-strong)] sm:rounded-[var(--radius-section)] sm:px-12 sm:py-20 lg:px-20">
            <div className="absolute -right-24 -top-32 size-96 rounded-full border-[4rem] border-[var(--accent)] opacity-20" aria-hidden="true" />
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
              <div>
                <p className="section-eyebrow text-[color:var(--foreground-on-strong-muted)]">Unsigned preview only</p>
                <h2 className="section-heading mt-5 max-w-4xl">Know what would happen before anything can happen.</h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--foreground-on-strong-muted)]">The final screen contains inspectable transaction targets, values, calldata, readiness, timestamps, and audit references. No signing action is available.</p>
              </div>
              <ul className="space-y-3 text-sm text-[color:var(--foreground-on-strong-muted)]">
                {["No private keys reach the server", "No wallet signature or transaction broadcast", "No protected position is created", "Stale facts require a fresh review"].map((item) => <li key={item} className="flex items-center gap-3 border-t border-[var(--border-on-strong)] pt-3"><span className="grid size-6 place-items-center rounded-full bg-[var(--accent)] text-[color:var(--accent-foreground)]"><Check className="size-3.5" aria-hidden="true" /></span>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 py-28 text-center lg:py-40">
          <h2 className="section-heading mx-auto max-w-3xl">Start with what the money is for.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[color:var(--foreground-soft)]">Define the goal first. Every protection decision follows from there.</p>
          <Link href="/goals/new" className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-[var(--button-primary-bg)] px-8 text-sm font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98]">Build my protection plan<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className="rounded-t-[2.25rem] bg-[var(--footer-bg)] text-[color:var(--footer-fg)] sm:rounded-t-[var(--radius-section)]">
        <div className="page-shell grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em]"><NiulaiMark surface="dark" />GoalGuard</div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--foreground-on-strong-muted)]">Goal-first ETH downside protection with transparent, independently reviewed unsigned previews.</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Explore</p>
            <nav aria-label="Footer navigation" className="mt-4 grid gap-3 text-sm text-[color:var(--foreground-on-strong-muted)]"><a href="#how-it-works" className="w-fit hover:text-[color:var(--foreground-on-strong)]">How it works</a><a href="#trust-safety" className="w-fit hover:text-[color:var(--foreground-on-strong)]">Trust & safety</a><a href="#live-foundations" className="w-fit hover:text-[color:var(--foreground-on-strong)]">Live foundations</a></nav>
          </div>
          <div>
            <p className="text-sm font-semibold">Release boundary</p>
            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-on-strong-muted)]">Preview only · Base chain ID 8453<br />No signing or broadcasting</p>
          </div>
        </div>
        <div className="page-shell"><div className="flex flex-col gap-2 border-t border-[var(--border-on-strong)] py-6 text-xs text-[color:var(--foreground-on-strong-muted)] sm:flex-row sm:items-center sm:justify-between"><p>GoalGuard · MUBA Hacks 2026</p><p>Built with Gonka, Thetanuts, and Base.</p></div></div>
      </footer>
    </>
  );
}
