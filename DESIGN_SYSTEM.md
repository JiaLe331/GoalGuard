# GoalGuard Design System

**Version:** 2.1  
**Revised:** 2026-09-03  
**Status:** Authoritative frontend visual and interaction specification

## 0. Authority and intent

This document adapts the supplied `DESIGN_SYSTEM (1).md` to GoalGuard. Product truth, safety boundaries, and canonical data contracts remain governed by `goalguard_prd.md`, especially Section 17. When a visual example conflicts with product truth or accessibility, product truth and WCAG AA take precedence.

GoalGuard uses a **purpose-tech editorial finance** direction:

> A private-wealth publication transformed into a calm, transparent downside-protection experience.

The interface combines a warm, human editorial layer with compact near-black financial modules. It must not retain visual residue from the previous cyber-fintech direction.

Remove or avoid:

- forest or charcoal as the page-wide canvas;
- acid-lime and cyan as primary interface colors;
- neon gradients, technical grids, glow effects, and glass panels;
- 3D icons or a large interactive shield as the hero visual;
- terminal-like labels, excessive monospace, or crypto-native visual shorthand;
- invented portfolio values, prices, protocol facts, or transaction outcomes.

## 1. Non-negotiable principles

1. Use oversized `Instrument Serif` typography for major statements.
2. Use `Inter` for UI, navigation, labels, body text, identifiers, and financial metadata.
3. Use a warm off-white canvas and near-black financial modules.
4. Use muted terracotta only for meaningful emphasis and selected actions.
5. Keep marketing/editorial content visually distinct from financial and transaction data.
6. Prefer asymmetric 12-column compositions and generous negative space.
7. Prefer thin borders; use shadows only when overlap requires depth.
8. Use one dominant action per view and familiar Web2 financial interaction patterns.
9. Explain what is happening, what happened, what happens next, and whether any action moves value.
10. Use only validated live or server-authoritative product data in production UI.
11. Meet WCAG 2.2 AA, including contrast, keyboard navigation, focus visibility, and 200% zoom.
12. Respect reduced motion and never make animation necessary to understand state.
13. Use `FloatingEditorialNavbar` as the marketing-page navigation pattern.
14. Do not introduce new colors, radii, shadows, or type roles without updating this file.

## 2. Design tokens

Use a three-layer structure: primitive values, semantic aliases, then component tokens. Components consume semantic or component tokens—never raw hex values.

### 2.1 Primitive tokens

```css
:root {
  /* Color primitives */
  --neutral-canvas: #f5f5f2;
  --neutral-white: #ffffff;
  --neutral-ink: #11110f;
  --neutral-ink-soft: #34332f;
  --neutral-muted: #77756f;
  --neutral-muted-light: #aaa7a0;
  --neutral-border: #dcdad4;
  --neutral-border-soft: #e9e7e2;

  --neutral-dark: #151512;
  --neutral-dark-raised: #1c1c18;
  --neutral-black: #0e0e0c;
  --neutral-dark-border: #30302b;
  --neutral-on-dark: #f7f6f1;
  --neutral-on-dark-muted: #96958e;

  --terracotta: #b34f3a;
  --terracotta-bright: #d16045;
  --terracotta-muted: #8f4536;
  --status-positive: #5e8e62;
  --status-negative: #b85c4a;

  /* Spacing: 4px micro-step, 8px layout rhythm */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;
  --space-10: 128px;
  --space-11: 160px;
  --space-12: 200px;

  /* Shape */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  /* Motion */
  --duration-fast: 160ms;
  --duration-normal: 280ms;
  --duration-slow: 600ms;
  --ease-premium: cubic-bezier(0.22, 1, 0.36, 1);

  /* Elevation */
  --shadow-floating: 0 1px 2px rgb(0 0 0 / 0.04), 0 16px 40px rgb(0 0 0 / 0.06);
  --shadow-hero-module: 0 24px 80px rgb(0 0 0 / 0.14);
}
```

### 2.2 Semantic tokens

```css
:root {
  --background: var(--neutral-canvas);
  --surface: var(--neutral-white);
  --foreground: var(--neutral-ink);
  --foreground-soft: var(--neutral-ink-soft);
  --muted: var(--neutral-muted);
  --muted-light: var(--neutral-muted-light);
  --border: var(--neutral-border);
  --border-soft: var(--neutral-border-soft);

  --surface-dark: var(--neutral-dark);
  --surface-dark-raised: var(--neutral-dark-raised);
  --surface-black: var(--neutral-black);
  --dark-border: var(--neutral-dark-border);
  --text-on-dark: var(--neutral-on-dark);
  --text-on-dark-muted: var(--neutral-on-dark-muted);

  --accent: var(--terracotta);
  --accent-hover: var(--terracotta-muted);
  --accent-bright: var(--terracotta-bright);
  --positive: var(--status-positive);
  --negative: var(--status-negative);

  --focus-ring: var(--foreground);
  --error-text: var(--foreground-soft);
  --success-text: var(--foreground-soft);
}
```

### 2.3 Accessibility usage rules

The supplied palette is preserved. Accessibility is achieved by assigning its colors to safe roles:

- `--foreground` and `--foreground-soft` are the only default colors for normal text on light surfaces.
- `--muted` is not used for normal text below 18px because it is 4.22:1 on the canvas. Reserve it for large text, disabled text, or non-text decoration.
- `--muted-light` is decorative only on light surfaces; never use it for instructions, labels, placeholders, or metadata.
- `--text-on-dark-muted` may be used for normal text on `--surface-dark`.
- Terracotta meets AA for normal text on the canvas, but use it sparingly.
- Positive and negative hues supplement an icon and explicit status label. On light surfaces the readable label remains `--foreground-soft`.
- Text contrast is at least 4.5:1; large text and meaningful non-text boundaries are at least 3:1.
- Focus indicators are at least 2px with a 2–3px offset and at least 3:1 contrast.

### 2.4 Component tokens

```css
:root {
  --button-primary-bg: var(--foreground);
  --button-primary-fg: var(--surface);
  --button-primary-border: var(--foreground);
  --button-secondary-bg: transparent;
  --button-secondary-fg: var(--foreground);
  --button-secondary-border: var(--border);

  --input-bg: var(--surface);
  --input-fg: var(--foreground);
  --input-border: var(--border);
  --input-placeholder: var(--foreground-soft);
  --input-focus: var(--foreground);

  --editorial-card-bg: var(--surface);
  --editorial-card-fg: var(--foreground);
  --editorial-card-border: var(--border-soft);
  --finance-card-bg: var(--surface-dark);
  --finance-card-fg: var(--text-on-dark);
  --finance-card-muted: var(--text-on-dark-muted);

  --navbar-bg: rgb(245 245 242 / 0.92);
  --navbar-bg-scrolled: rgb(245 245 242 / 0.97);
  --navbar-fg: var(--foreground);
  --navbar-border: rgb(17 17 15 / 0.08);
  --navbar-shadow: 0 1px 2px rgb(0 0 0 / 0.03), 0 8px 28px rgb(0 0 0 / 0.055);
}
```

## 3. Typography

Load fonts through `next/font`.

```css
:root {
  --font-display: "Instrument Serif", Georgia, "Times New Roman", serif;
  --font-sans: "Inter", "Helvetica Neue", Arial, sans-serif;
}
```

| Role | Family | Size | Line height | Notes |
|---|---|---:|---:|---|
| Display XL | Display | `clamp(64px, 8.5vw, 132px)` | 0.87 | Homepage only; mobile override below |
| Display L | Display | `clamp(56px, 7vw, 104px)` | 0.92 | Major editorial section |
| H1 | Display | `clamp(52px, 6vw, 88px)` | 0.95 | Workflow title may use smaller clamp |
| H2 | Display | `clamp(42px, 5vw, 72px)` | 1 | Section title |
| H3 | Display | `clamp(30px, 3vw, 42px)` | 1.05 | Card-group title |
| Body large | Sans | 18px | 1.6 | Hero support and lead copy |
| Body | Sans | 16px | 1.6 | Default, including mobile |
| Body small | Sans | 13px | 1.55 | Supporting copy only |
| Navigation | Sans | 13px | 1.4 | 500 weight |
| Eyebrow/metadata | Sans | 12px | 1.4 | Uppercase, 0.12em tracking |
| Financial label | Sans | 12px | 1.4 | Uppercase, 0.1em tracking |
| Financial value | Display or Sans | 28px+ | 1 | Use tabular figures where alignment matters |
| Identifier | Sans | 12–13px | 1.5 | Tabular figures; allow safe wrapping |

Display headings use weight 400, tight negative tracking, and sparing italic terracotta emphasis on conceptual words such as *purpose*, *clarity*, and *control*. Do not color entire sentences.

Do not use monospace as a decorative style. Addresses and request IDs remain readable in Inter with `font-variant-numeric: tabular-nums` and `overflow-wrap: anywhere`.

## 4. Layout and rhythm

- Page maximum width: 1440px.
- Desktop: 12 columns; tablet: 8 columns; mobile: 4 columns or a single reading column.
- Desktop gutter: 32px; tablet gutter: 32px; mobile gutter: 20–24px.
- Desktop grid gap: 24px.
- Major sections: `padding-block: clamp(96px, 11vw, 180px)`.
- Compact workflow sections may use 64–80px where task completion benefits from proximity.
- Long prose measure: 60–75 characters desktop and 35–60 characters mobile.
- Do not vertically center every section or collapse whitespace to place more content above the fold.
- Use `scroll-margin-top` of at least 112px for anchored sections so the fixed navbar never obscures headings or keyboard focus.

Preferred desktop compositions are 7/5, 8/4, or 5/5 with two columns of deliberate whitespace—not repetitive 6/6 splits.

## 5. `FloatingEditorialNavbar`

### 5.1 Purpose

`FloatingEditorialNavbar` is the required landing-page navigation. The floating pill is a contemporary framing device; its warm, nearly opaque material and restrained motion keep it editorial rather than glassmorphic.

It must feel detached, compact, calm, architectural, and lightly elevated. It must not feel glossy, neon, heavily blurred, or composed of nested pills.

### 5.2 GoalGuard information architecture

Desktop order:

```text
GoalGuard | How it works | Trust & safety | Live foundations | Preview only | Connect wallet | Start a goal
```

- Brand links to `#top`.
- `How it works` links to `#how-it-works`.
- `Trust & safety` links to `#trust-safety`.
- `Live foundations` links to `#live-foundations`.
- `Preview only` is a non-interactive status, not a navigation link.
- Wallet control is secondary and must never visually compete with the primary CTA.
- `Start a goal` is the single dark primary CTA and links to `#goal-composer`.
- Do not add fictional login, signup, platform, journal, or performance routes.

### 5.3 Component API

```tsx
type EditorialNavLink = {
  label: string;
  href: `#${string}` | `/${string}`;
};

type FloatingEditorialNavbarProps = {
  brand: React.ReactNode;
  links: readonly EditorialNavLink[];
  activeHref?: EditorialNavLink["href"];
  statusLabel?: string;
  walletSlot?: React.ReactNode;
  primaryAction: EditorialNavLink;
};
```

The component renders a semantic `<header>` and labelled `<nav>`. Decorative icons are hidden from assistive technology; icon-only controls require accessible names.

### 5.4 Desktop geometry and material

```css
.floating-editorial-navbar {
  position: fixed;
  inset-block-start: 20px;
  inset-inline-start: 50%;
  z-index: 50;
  width: min(calc(100% - 40px), 1140px);
  min-height: 60px;
  transform: translateX(-50%);

  display: flex;
  align-items: center;
  padding: 8px 10px 8px 20px;

  color: var(--navbar-fg);
  background: var(--navbar-bg);
  border: 1px solid var(--navbar-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--navbar-shadow);
  backdrop-filter: blur(12px);
}
```

- Top offset: 16–24px.
- Height: 56–64px; do not animate height.
- Maximum width: 1080–1180px.
- Link gap: 24–32px.
- Logo visual height: 20–28px; use a monochrome mark and restrained wordmark.
- Navbar links are plain text, not individual pills.
- Active state uses darker text plus a 1px underline or bottom rule; never color alone.
- Primary CTA minimum height: 44px; all controls have at least a 44×44px target.

Blur is a supporting effect. The navbar remains close to opaque and falls back to an opaque canvas background when `backdrop-filter` is unavailable.

### 5.5 Scroll behavior

After the page crosses a stable 24px threshold, set `data-scrolled="true"` and change only background opacity, border, and shadow. Do not animate height, hide the navbar, bounce it, or use scroll-linked parallax.

Use a passive scroll listener or an intersection sentinel and avoid continuous per-frame state updates. Transitions use `--duration-normal` and `--ease-premium`.

### 5.6 Mobile behavior

Below 768px:

```text
GoalGuard | Preview only | Menu
```

- Top offset: `max(12px, env(safe-area-inset-top))`.
- Width: `calc(100% - 24px)`.
- Minimum height: 54px.
- Padding: 7px 8px 7px 16px.
- Desktop links, wallet control, and primary CTA move into one menu sheet.
- The menu button exposes `aria-expanded` and `aria-controls`.
- The sheet traps focus, closes on Escape and outside press, restores focus to the menu trigger, prevents background scroll, and has a visible close control.
- Links remain at least 44px high and are not icon-only.
- Selecting an anchor closes the sheet and moves focus to the destination section heading.

### 5.7 Focus and stacking

- The skip link must render above the navbar and land on the main content.
- Focused content must not be hidden behind the fixed navbar.
- Navbar z-index is 50; sheets and dialogs are 100; skip link is 110.
- At 200% zoom, switch to the mobile menu when links no longer fit rather than clipping or horizontally scrolling.
- Reduced motion disables nonessential transitions while preserving state changes.

## 6. Buttons, forms, and feedback

### Buttons

- Primary: near-black background, white text, pill radius, minimum 44px height.
- Secondary: transparent, foreground text, 1px neutral border, pill radius.
- Ghost: text-first with a stable hover surface and no border unless focused.
- Press feedback arrives within 100ms without changing layout bounds.
- Loading buttons preserve their width, set `aria-busy`, disable repeat submission, and announce the active action.

### Forms

- Every field has a visible label and persistent helper text where financial interpretation is needed.
- Validate after blur or submit, not on every keystroke.
- Inline errors state the cause and recovery; multi-error forms also show a focusable linked summary.
- Inputs are at least 44px high and remain 16px on mobile to prevent browser zoom.
- Previously supplied values stay populated when moving backward in the workflow.

### Feedback

Every asynchronous state answers:

1. What is GoalGuard doing?
2. Which live or server-authoritative source is involved?
3. What will happen next?
4. Can the user safely leave, retry, or go back?

Never show fabricated percentages or timed progress. Use a concise status message and subtle, reduced-motion-safe feedback only while the request is active.

## 7. Card families and financial UI

Do not style every panel as the same rounded card.

1. **Editorial card:** canvas/white, thin border, serif heading, generous padding.
2. **Financial card:** near-black, compact, data-led, 16–20px radius, no decorative glow.
3. **Floating financial module:** near-black, overlaps hero media, uses approved floating shadow.
4. **Insight block:** text-led, separated by rules rather than a boxed container.

Financial UI rules:

- Financial values use tabular figures and locale-aware formatting.
- Directly label small scenario comparisons; provide a semantic table or text equivalent.
- Use muted terracotta for a primary data line, never rainbow or neon series.
- Gridlines are sparse and low contrast; labels are at least 12px.
- Positive/negative status always includes an icon and explicit wording.
- Production components display only validated candidate, council, wallet, and preview values. Example data is limited to tests, Storybook-like fixtures, or clearly labelled design mockups.

## 8. Hero and local architectural media

The homepage hero is asymmetric and begins 120–150px below the viewport top to clear the floating navbar.

Preferred composition:

```text
Oversized purpose-led headline (7–8 columns) | concise support copy / CTA (3–4 columns)
Local architectural image spanning the lower composition
Factual dark GoalGuard modules overlapping the media edge
```

Media requirements:

- Use one locally bundled, optimized architectural or refined workspace image—no runtime hotlink.
- Mood: warm neutral materials, restrained saturation, natural light, editorial framing, minimal visual noise.
- Avoid crypto coins, holographic overlays, handshakes, generic laptop stock, and obvious AI-finance clichés.
- Store the final asset under `public/media/` and render it with `next/image`, explicit dimensions or aspect ratio, and responsive `sizes`.
- Use meaningful alt text only when the image communicates content; otherwise use empty alt text.
- Mobile removes fragile overlap and places financial modules below the image.
- Optional hover zoom is capped at 1.02 and disabled for coarse pointers and reduced motion.

The hero keeps GoalGuard’s human-purpose language. It does not use the previous interactive 3D shield. A small flat shield may remain in the brand mark or safety status where semantically useful.

## 9. Web3 trust and transparency

Apply Web3 UX principles through behavior and information hierarchy, not crypto-native styling.

### Active guidance

- Use familiar financial forms and a persistent five-step workflow indicator.
- Define unfamiliar terms in concise helper text or disclosures.
- Preserve predictable Back actions and user-entered values.

### Consistency

- Use this design system across landing, goal definition, candidate review, council drawer, preview confirmation, demo-ready, error, and read-only states.
- Do not mix the warm editorial system with cyber colors, terminal motifs, or unrelated card styles.

### Community and review values

- Explain the three Gonka council roles in plain language.
- Show verdict text, concerns, disclosures, model, and copyable request IDs.
- Never imply community consensus beyond the actual recorded council result.

### Data provenance

- Label live market facts as Thetanuts/Base data and show `marketAsOf` when available.
- Distinguish blockchain-derived values, wallet-read values, AI review, and deterministic GoalGuard calculations.
- Show contract target, chain ID, and referrer disclosure only from canonical preview data.

### Transaction transparency

- Before preview generation, show exact cost, maximum cost at risk, coverage, expiry conditions, connected wallet, network, and the unsigned-only boundary.
- Identify allowance and execution transaction data separately.
- State clearly that P0 creates no signature, broadcast, protected position, or on-chain event.
- Explain quote expiry, stale data, insufficient balance, and wallet/network invalidation with a recovery path.

### Events and history

- Because P0 is preview-only, do not invent smart-contract events or a transaction history.
- Show the current goal’s real audit references, timestamps, council IDs, and preview expiry when available.
- Historical live-execution records remain read-only and visibly distinct.

### Code transparency

- Keep “How it works” and “Trust & safety” reachable from the navbar.
- Explain which work is AI-generated and which calculations and validations are deterministic.
- Link to the public repository only when the canonical URL is configured and intentional.

## 10. Iconography and motion

- Use Phosphor outline icons at one consistent weight.
- Default UI icons: 16px; actions: 16–20px; feature icons: 20–24px.
- Decorative icons beside visible text use `aria-hidden="true"`.
- Do not use emoji, 3D icons, mixed icon families, or decorative colored icon tiles.

Motion uses opacity and transform only. Recommended behaviors:

- color/state response: `--duration-fast`;
- panel/content entry: `--duration-normal`;
- image treatment: up to `--duration-slow`;
- exit is shorter than entry;
- at most one or two key animated elements per view;
- no looping animation except a request-bound loading indicator;
- no animation blocks interaction or controls functional state.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 11. Responsive rules

Breakpoints: 640px, 768px, 1024px, 1280px, and 1536px.

- **Desktop ≥1024px:** 12-column asymmetric grid, large serif type, controlled overlap, generous section rhythm.
- **Tablet 768–1023px:** 8-column grid, reduced display scale, limited overlap, supporting copy adjacent or below.
- **Mobile <768px:** single reading flow, 20–24px gutters, no fragile overlap, full-width financial modules, 48–64px hero type, 16px body.
- No horizontal page scrolling at 320px or wider.
- Preserve reading and interaction at 200% zoom.
- Touch targets are at least 44×44px with at least 8px separation where accidental activation is plausible.

## 12. Required component inventory

Build or adapt reusable components only when the existing primitives cannot satisfy the role:

```text
Layout:      PageContainer, Section, EditorialGrid, SplitLayout, Stack, Cluster
Navigation:  FloatingEditorialNavbar, NavLink, NavCTA, MobileNavigation
Typography:  DisplayHeading, SectionHeading, Eyebrow, BodyText, Caption, FinancialValue
Actions:     PrimaryButton, SecondaryButton, TextLink, IconButton
Finance:     FinancialCard, FinancialMetric, ScenarioComparison, AssetRow, PercentageBadge
Editorial:   EditorialCard, MediaCard, InsightBlock, QuoteBlock
Workflow:    StageShell, CouncilCard, UnsignedTransactionCard, TrustRail
Utility:     Divider, StatusBadge, Alert, Drawer, Accordion
```

New components inherit this token system. Do not build unused generic investment-dashboard components that are unsupported by GoalGuard’s P0 data.

## 13. Page architecture

Landing page:

```text
FloatingEditorialNavbar
Hero + goal composer + local architectural media + factual preview modules
How it works
Trust & safety / data provenance
Live foundations
Final start-goal CTA
Restrained footer
```

Workflow:

```text
Compact brand/wallet header
Five-step progress rail
Current-stage editorial heading
Primary task surface
Dark financial facts where appropriate
One primary action and subordinate recovery/back actions
```

The workflow remains preview-only. This design system does not authorize signing, broadcasting, contract changes, backend API changes, or fabricated demo data.

## 14. Implementation rules

1. Import this file into the repository as the visual source of truth and keep it versioned.
2. Implement tokens in `src/styles/tokens.css` using the primitive → semantic → component layers above.
3. Import tokens from `src/app/globals.css`; keep reset, base elements, accessibility utilities, and reduced-motion rules there.
4. Use Tailwind CSS v4 utilities against CSS variables; do not add a legacy config solely to mirror examples from the source document.
5. Load Instrument Serif and Inter through `next/font`.
6. Reuse existing accessible primitives before creating variants.
7. Keep landing content server-rendered; client boundaries are limited to interactions such as navigation menu, wallet, composer, and live status.
8. Do not use raw hex, arbitrary radii, arbitrary shadows, gradients, or backdrop blur in component files.
9. Do not ship links to routes or sections that do not exist.
10. Preserve the P0 reducer, canonical contracts, error details, and unsigned-preview safety boundary.

## 15. Acceptance checklist

### Visual consistency

- [ ] Warm off-white is the dominant page canvas.
- [ ] Instrument Serif drives major hierarchy; Inter drives all UI/body roles.
- [ ] Near-black is reserved for factual financial and transaction modules.
- [ ] Terracotta remains sparse and meaningful.
- [ ] No lime/cyan cyber residue, technical grids, neon gradients, glow, or decorative 3D shield remains.
- [ ] Card families are visibly distinct and shadows are limited to overlap.
- [ ] Local architectural media is optimized and does not display invented financial information.

### `FloatingEditorialNavbar`

- [ ] Floats 12–24px from the viewport top and never spans the full desktop viewport.
- [ ] Uses the exact GoalGuard information architecture and existing anchors.
- [ ] Keeps only the main CTA as a nested dark pill.
- [ ] Scroll state changes opacity/border/shadow without resizing or hiding.
- [ ] Mobile uses an accessible menu sheet with focus trap and focus restoration.
- [ ] Skip link, anchor targets, 200% zoom, and keyboard focus are never obscured.
- [ ] No navigation link points to an unimplemented route.

### Accessibility and UX

- [ ] Normal text contrast is at least 4.5:1 and meaningful UI boundaries at least 3:1.
- [ ] Body text is 16px on mobile; supporting/metadata text is never below 12px.
- [ ] All controls are keyboard operable with visible focus and at least 44×44px targets.
- [ ] Status never relies on color alone.
- [ ] Forms retain linked inline errors and an error summary when needed.
- [ ] Reduced motion, 200% zoom, 320px width, and no-horizontal-overflow checks pass.
- [ ] Charts have direct labels and semantic text/table equivalents.

### Web3 transparency

- [ ] Each live fact identifies its source and timestamp where available.
- [ ] AI review is distinguished from deterministic calculations.
- [ ] Every value-sensitive step explains cost, risk, wallet, network, and next action.
- [ ] Preview-only screens explicitly state that no signature, broadcast, position, or on-chain event exists.
- [ ] Failures state the cause and a safe recovery path.

### Validation

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] Axe scans and deterministic screenshots at 375px, 768px, 1024px, and 1440px

