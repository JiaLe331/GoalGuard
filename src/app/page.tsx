import { GoalComposer } from "@/components/goals/goal-composer";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WalletControl } from "@/components/wallet/wallet-control";

const principles = [
  { step: "01", title: "State the goal", body: "Start with rent, tuition, travel, or any deadline that matters." },
  { step: "02", title: "Review the protection", body: "Independent AI roles challenge one live, deterministic plan." },
  { step: "03", title: "You decide", body: "Nothing reaches your wallet without exact costs and explicit approval." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <header className="flex min-h-24 items-start justify-between gap-6 py-6 sm:items-center">
          <a href="#top" className="flex items-center gap-3 text-white" aria-label="GoalGuard home">
            <span className="grid size-10 place-items-center rounded-xl border border-[#cbff6b]/25 bg-[#cbff6b]/10 shadow-[inset_0_0_20px_rgba(203,255,107,0.08)]">
              <span className="shield-mark" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-[-0.02em]">GoalGuard</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#829289]">Purpose protected</span>
            </span>
          </a>
          <WalletControl />
        </header>

        <section id="top" className="grid items-center gap-12 pb-14 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:pb-24 lg:pt-20">
          <div className="max-w-3xl">
            <StatusBadge label="P0 workflow · Live execution gated" tone="warning" />
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[5rem]">
              Protect the purpose <span className="text-[#cbff6b]">behind your money.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[#a8b7ad] sm:text-xl">
              Tell GoalGuard what matters and when you need it. Every protection plan starts with live market facts, independent review, and your final say.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {principles.map((item) => (
                <div key={item.step} className="border-l border-white/10 pl-4">
                  <p className="font-mono text-xs text-[#91e95f]">{item.step}</p>
                  <h2 className="mt-2 text-sm font-semibold text-white">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#819087]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="relative p-6 sm:p-8">
            <div className="absolute -right-3 -top-3 rounded-full border border-[#cbff6b]/20 bg-[#16251b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#bce77d]">Session-private</div>
            <GoalComposer />
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <Card className="p-6 sm:p-8">
            <IntegrationStatus />
          </Card>
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#cbff6b]/10 blur-3xl" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#91a398]">Safety boundary</p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.025em] text-white">AI explains. Deterministic code calculates. You approve.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "No private keys on the server",
                "Base mainnet only",
                "Live execution disabled by default",
                "No fabricated prices or protection",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-sm text-[#c3d0c7]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#91e95f]/10 text-xs text-[#baff8a]" aria-hidden="true">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-7 text-xs leading-5 text-[#75847b]">The workflow uses only validated backend records. If a required GoalGuard, Gonka, or Thetanuts service is unavailable, the UI stops safely and preserves your goal.</p>
          </Card>
        </section>

        <footer className="mt-14 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-[#6f7e75] sm:flex-row sm:items-center sm:justify-between">
          <p>GoalGuard · MUBA Hacks 2026</p>
          <p>Goal-first protection, built with Gonka and Thetanuts.</p>
        </footer>
      </div>
    </main>
  );
}
