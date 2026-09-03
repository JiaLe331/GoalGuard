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
  return (
    <a href="#top" className="flex min-h-11 w-fit items-center gap-2.5 rounded-sm pr-2 text-[1.05rem] font-semibold tracking-[-0.035em]" aria-label="GoalGuard home">
      <span className="brand-mark" aria-hidden="true" />
      <span>GoalGuard</span>
    </a>
  );
}

function StatusLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-[0.08em]">
      <ShieldCheck className="size-4" aria-hidden="true" />
      {label}
    </span>
  );
}

export type FloatingEditorialNavbarProps = {
  brand?: ReactNode;
  links?: readonly EditorialNavLink[];
  activeHref?: EditorialNavLink["href"];
  statusLabel?: string;
  walletSlot?: ReactNode;
  primaryAction?: EditorialNavLink;
};

export function FloatingEditorialNavbar({
  brand,
  links = defaultLinks,
  activeHref,
  statusLabel = "Preview only",
  walletSlot,
  primaryAction = defaultPrimaryAction,
}: FloatingEditorialNavbarProps) {
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
    }, { rootMargin: "-24% 0px -66%", threshold: 0 });
    for (const link of sectionLinks) {
      const target = document.querySelector(link.href);
      if (target) observer.observe(target);
    }
    const onTop = () => { if (window.scrollY < 64) setObservedHref("#top"); };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onTop);
    };
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
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-50 w-full border-b border-[var(--navbar-border)] bg-[var(--navbar-bg)] transition-shadow duration-[var(--duration-enter)] data-[scrolled=true]:shadow-[var(--shadow-header)]"
    >
      <nav aria-label="Primary navigation" className="page-shell grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 min-[1120px]:min-h-20 min-[1120px]:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] min-[1120px]:gap-6 xl:gap-8">
        {brand ?? <Brand />}

        <div className="hidden items-center gap-7 min-[1120px]:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={currentHref === link.href ? "location" : undefined}
              className={`relative flex min-h-11 items-center text-sm font-medium text-[color:var(--foreground-soft)] transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:origin-left after:bg-[var(--accent)] after:transition-transform ${currentHref === link.href ? "text-[color:var(--foreground)] after:scale-x-100" : "after:scale-x-0 hover:text-[color:var(--foreground)] hover:after:scale-x-100"}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden min-w-max shrink-0 items-center justify-end gap-2 min-[1120px]:flex">
          <StatusLabel label={statusLabel} />
          {walletSlot ?? <WalletControl compact />}
          <a href={primaryAction.href} className="inline-flex min-h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[color:var(--button-primary-fg)] transition-colors hover:bg-[var(--button-primary-hover)] active:opacity-85 xl:px-6">
            {primaryAction.label}
          </a>
        </div>

        <div className="flex items-center justify-end gap-2 min-[1120px]:hidden">
          <span className="hidden sm:inline-flex"><StatusLabel label={statusLabel} /></span>
          <Button ref={menuButton} variant="secondary" className="min-w-11 px-3" aria-expanded={open} aria-controls="editorial-navigation-menu" onClick={() => setOpen(true)}>
            <List className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Menu</span>
            <span className="sr-only sm:hidden">Menu</span>
          </Button>
        </div>
      </nav>

      <Drawer open={open} title="Explore GoalGuard" onClose={close} labelledId="editorial-navigation-menu" restoreFocusRef={menuButton}>
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
          <div className="mb-6 rounded-[var(--radius-control)] bg-[var(--accent-soft)] px-4 py-2"><StatusLabel label={statusLabel} /></div>
          <div className="grid">
            {links.map((link, index) => (
              <a key={link.href} href={link.href} onClick={() => selectAnchor(link.href)} className="flex min-h-16 items-center justify-between border-b border-[var(--border)] text-lg font-medium">
                <span>{link.label}</span>
                <span className="text-xs tabular-nums text-[color:var(--foreground-muted)]" aria-hidden="true">0{index + 1}</span>
              </a>
            ))}
          </div>
          <div className="mt-auto grid gap-3 pt-8">
            {walletSlot ?? <WalletControl />}
            <a href={primaryAction.href} onClick={() => selectAnchor(primaryAction.href)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--black)] px-6 text-sm font-semibold text-[color:var(--white)]">
              {primaryAction.label}
            </a>
          </div>
        </div>
      </Drawer>
    </header>
  );
}
