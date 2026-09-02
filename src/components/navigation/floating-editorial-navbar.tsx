"use client";

import { List, ShieldCheck } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { WalletControl } from "@/components/wallet/wallet-control";

export type EditorialNavLink = { label: string; href: `#${string}` | `/${string}` };

const defaultLinks: readonly EditorialNavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Trust & safety", href: "#trust-safety" },
  { label: "Live foundations", href: "#live-foundations" },
];
const defaultPrimaryAction: EditorialNavLink = { label: "Start a goal", href: "#goal-composer" };

function Brand() {
  return <a href="#top" className="flex min-h-11 items-center gap-2 rounded-full font-semibold tracking-[-0.02em]" aria-label="GoalGuard home"><span className="brand-shield" aria-hidden="true" /><span>GoalGuard</span></a>;
}

function StatusLabel({ label }: { label: string }) {
  return <span className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.08em]"><ShieldCheck className="hidden size-4 sm:block" aria-hidden="true" />{label}</span>;
}

export type FloatingEditorialNavbarProps = {
  brand?: ReactNode;
  links?: readonly EditorialNavLink[];
  activeHref?: EditorialNavLink["href"];
  statusLabel?: string;
  walletSlot?: ReactNode;
  primaryAction?: EditorialNavLink;
};

export function FloatingEditorialNavbar({ brand, links = defaultLinks, activeHref, statusLabel = "Preview only", walletSlot, primaryAction = defaultPrimaryAction }: FloatingEditorialNavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [observedHref, setObservedHref] = useState<EditorialNavLink["href"]>("#top");
  const menuButton = useRef<HTMLButtonElement>(null);
  const currentHref = activeHref ?? observedHref;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (activeHref || !("IntersectionObserver" in window)) return;
    const sectionLinks = [...links, primaryAction].filter((link) => link.href.startsWith("#"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target.id) setObservedHref(("#" + visible.target.id) as EditorialNavLink["href"]);
    }, { rootMargin: "-20% 0px -68%", threshold: 0 });
    for (const link of sectionLinks) {
      const target = document.querySelector(link.href);
      if (target) observer.observe(target);
    }
    const onTop = () => { if (window.scrollY < 80) setObservedHref("#top"); };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onTop); };
  }, [activeHref, links, primaryAction]);

  const close = useCallback(() => setOpen(false), []);
  const selectAnchor = useCallback((href: EditorialNavLink["href"]) => {
    close();
    if (!href.startsWith("#")) return;
    window.setTimeout(() => {
      const destination = document.querySelector<HTMLElement>(href);
      destination?.querySelector<HTMLElement>("h1, h2, [tabindex='-1']")?.focus({ preventScroll: true });
    }, 0);
  }, [close]);

  return (
    <header className="fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2 min-[960px]:top-5 min-[960px]:w-[min(calc(100%-2.5rem),71.25rem)]">
      <nav aria-label="Primary navigation" data-scrolled={scrolled} className="flex min-h-[3.375rem] items-center justify-between rounded-full border border-[var(--navbar-border)] bg-[var(--navbar-bg)] py-1.5 pl-4 pr-2 text-[var(--navbar-fg)] shadow-[var(--navbar-shadow)] backdrop-blur-[12px] transition-[background-color,border-color,box-shadow] duration-[var(--duration-normal)] data-[scrolled=true]:bg-[var(--navbar-bg-scrolled)] min-[960px]:min-h-[3.75rem] min-[960px]:py-2 min-[960px]:pl-5 min-[960px]:pr-2.5">
        {brand ?? <Brand />}
        <div className="hidden items-center gap-6 min-[960px]:flex">
          {links.map((link) => <a key={link.href} href={link.href} aria-current={currentHref === link.href ? "location" : undefined} className={`relative flex min-h-11 items-center text-[13px] font-medium after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:bg-current after:transition-transform ${currentHref === link.href ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`}>{link.label}</a>)}
        </div>
        <div className="hidden items-center gap-2 min-[960px]:flex">
          <StatusLabel label={statusLabel} />
          {walletSlot ?? <WalletControl compact />}
          <a href={primaryAction.href} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[var(--button-primary-fg)] transition-transform active:translate-y-px">{primaryAction.label}</a>
        </div>
        <div className="flex items-center gap-2 min-[960px]:hidden">
          <span className="inline-flex"><StatusLabel label={statusLabel} /></span>
          <Button ref={menuButton} variant="ghost" className="min-w-11 px-3" aria-expanded={open} aria-controls="editorial-navigation-menu" onClick={() => setOpen(true)}><List className="size-5" aria-hidden="true" />Menu</Button>
        </div>
      </nav>
      <Drawer open={open} title="Explore GoalGuard" onClose={close} labelledId="editorial-navigation-menu" restoreFocusRef={menuButton}>
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
          <div className="mb-6 border-y border-[var(--border)] py-3"><StatusLabel label={statusLabel} /></div>
          <div className="grid">
            {links.map((link, index) => <a key={link.href} href={link.href} onClick={() => selectAnchor(link.href)} className="flex min-h-14 items-center justify-between border-b border-[var(--border-soft)] text-lg"><span>{link.label}</span><span aria-hidden="true">0{index + 1}</span></a>)}
          </div>
          <div className="mt-auto grid gap-3 pt-8">
            {walletSlot ?? <WalletControl />}
            <a href={primaryAction.href} onClick={() => selectAnchor(primaryAction.href)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--surface)]">{primaryAction.label}</a>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
