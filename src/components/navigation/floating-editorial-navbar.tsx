"use client";

import { List } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { NiulaiMark } from "@/components/brand/niulai-mascot";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { WalletControl } from "@/components/wallet/wallet-control";

export type EditorialNavLink = { label: string; href: `#${string}` | `/${string}` };
export type EditorialNavbarVariant = "marketing" | "workflow";

const defaultLinks: readonly EditorialNavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Trust & safety", href: "#trust-safety" },
  { label: "Live foundations", href: "#live-foundations" },
];

const defaultPrimaryAction: EditorialNavLink = { label: "Open workspace", href: "/dashboard" };

export function GoalGuardBrand({ href = "#top" }: { href?: string }) {
  return (
    <a href={href} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full px-1.5 text-[1.05rem] font-semibold tracking-[-0.035em]" aria-label="GoalGuard home">
      <NiulaiMark size="md" />
      <span className="truncate">GoalGuard</span>
    </a>
  );
}

export type FloatingEditorialNavbarProps = {
  variant?: EditorialNavbarVariant;
  brand?: ReactNode;
  brandHref?: string;
  links?: readonly EditorialNavLink[];
  activeHref?: EditorialNavLink["href"];
  contextLabel?: string;
  walletSlot?: ReactNode;
  primaryAction?: EditorialNavLink | null;
  /** Content for the workflow's phone-sized navigation drawer (normally the goals/services rail). */
  mobileDrawerContent?: ReactNode;
};

export function FloatingEditorialNavbar({
  variant = "marketing",
  brand,
  brandHref,
  links,
  activeHref,
  contextLabel,
  walletSlot,
  primaryAction,
  mobileDrawerContent,
}: FloatingEditorialNavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [observedHref, setObservedHref] = useState<EditorialNavLink["href"]>("#top");
  const menuButton = useRef<HTMLButtonElement>(null);
  const navLinks = useMemo(() => links ?? (variant === "marketing" ? defaultLinks : []), [links, variant]);
  const action = primaryAction === undefined ? (variant === "marketing" ? defaultPrimaryAction : null) : primaryAction;
  const currentHref = activeHref ?? observedHref;
  const mobileMenuId = variant === "workflow" ? "workflow-navigation-menu" : "editorial-navigation-menu";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (variant !== "marketing" || activeHref || !("IntersectionObserver" in window)) return;
    const sectionLinks = [...navLinks, ...(action ? [action] : [])].filter((link) => link.href.startsWith("#"));
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
  }, [action, activeHref, navLinks, variant]);

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
    <header data-scrolled={scrolled} data-variant={variant} className="group pointer-events-none sticky top-0 z-50 w-full px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
      <nav
        aria-label={variant === "marketing" ? "Primary navigation" : "Goal workflow navigation"}
        className="pointer-events-auto mx-auto flex min-h-[3.75rem] w-full max-w-[1540px] items-center gap-2 rounded-full border border-[var(--navbar-border)] bg-[var(--navbar-bg)] px-2.5 text-[color:var(--navbar-fg)] shadow-[var(--shadow-navbar)] transition-shadow duration-[var(--duration-enter)] group-data-[scrolled=true]:shadow-[var(--shadow-navbar-scrolled)] sm:min-h-16 sm:px-4"
      >
        <div className="min-w-0 shrink">{brand ?? <GoalGuardBrand href={brandHref ?? (variant === "marketing" ? "#top" : "/")} />}</div>

        {variant === "marketing" ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-5 min-[1200px]:flex min-[1360px]:gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={currentHref === link.href ? "location" : undefined}
                className={`relative flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-[color:var(--foreground-soft)] transition-colors after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:origin-left after:bg-[var(--accent)] after:transition-transform ${currentHref === link.href ? "text-[color:var(--foreground)] after:scale-x-100" : "after:scale-x-0 hover:text-[color:var(--foreground)] hover:after:scale-x-100"}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="hidden min-w-0 flex-1 items-center sm:flex">
            <span className="truncate border-l border-[var(--navbar-border)] pl-4 text-sm font-semibold text-[color:var(--foreground-soft)]">{contextLabel ?? "Goal protection"}</span>
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2.5 sm:gap-3">
          <ThemeSelector compact />
          {variant === "workflow" ? (
            <>
              {walletSlot ?? <WalletControl compact />}
              <Button ref={menuButton} variant="secondary" className="min-w-11 px-3 lg:hidden" aria-expanded={open} aria-controls={mobileMenuId} onClick={() => setOpen(true)}>
                <List className="size-5" aria-hidden="true" />
                <span className="hidden min-[520px]:inline">Menu</span>
                <span className="sr-only min-[520px]:hidden">Menu</span>
              </Button>
            </>
          ) : null}

          {variant === "marketing" ? (
            <>
              <span className="hidden min-[1200px]:inline-flex">{walletSlot ?? <WalletControl compact />}</span>
              {action ? <Link href={action.href} className="hidden min-h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--button-primary-bg)] px-5 text-sm font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98] min-[1200px]:inline-flex xl:px-6">{action.label}</Link> : null}
              <Button ref={menuButton} variant="secondary" className="min-w-11 px-3 min-[1200px]:hidden" aria-expanded={open} aria-controls={mobileMenuId} onClick={() => setOpen(true)}>
                <List className="size-5" aria-hidden="true" />
                <span className="hidden min-[520px]:inline">Menu</span>
                <span className="sr-only min-[520px]:hidden">Menu</span>
              </Button>
            </>
          ) : null}
        </div>
      </nav>

      {variant === "marketing" ? (
        <Drawer open={open} title="Explore GoalGuard" onClose={close} labelledId={mobileMenuId} restoreFocusRef={menuButton}>
          <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
            <div className="mb-5 flex flex-wrap items-center justify-end gap-3 rounded-[var(--radius-control)] bg-[var(--accent-soft)] px-4 py-2 text-[color:var(--accent-soft-foreground)]"><ThemeSelector /></div>
            <div className="grid">
              {navLinks.map((link, index) => (
                <a key={link.href} href={link.href} onClick={() => selectAnchor(link.href)} className="flex min-h-16 items-center justify-between border-b border-[var(--border)] text-lg font-medium">
                  <span>{link.label}</span>
                  <span className="text-xs tabular-nums text-[color:var(--foreground-muted)]" aria-hidden="true">0{index + 1}</span>
                </a>
              ))}
            </div>
            <div className="mt-auto grid gap-3 pt-8">
              {walletSlot ?? <WalletControl fullWidth />}
              {action ? <Link href={action.href} onClick={() => selectAnchor(action.href)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--button-primary-bg)] px-6 text-sm font-semibold text-[color:var(--button-primary-fg)]">{action.label}</Link> : null}
            </div>
          </div>
        </Drawer>
      ) : null}

      {variant === "workflow" ? (
        <Drawer open={open} title="Goal workspace menu" onClose={close} labelledId={mobileMenuId} restoreFocusRef={menuButton}>
          <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
            {contextLabel ? (
              <p className="mb-5 rounded-[var(--radius-control)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-5 text-[color:var(--accent-soft-foreground)]">{contextLabel}</p>
            ) : null}
            <nav aria-label="Goals" className="min-w-0">
              {mobileDrawerContent ?? <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">Your goals and connected services will appear here.</p>}
            </nav>
          </div>
        </Drawer>
      ) : null}
    </header>
  );
}
