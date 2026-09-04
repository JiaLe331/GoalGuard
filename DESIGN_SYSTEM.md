# GoalGuard Design System

**Version:** 3.2

**Revised:** 2026-09-03

**Direction:** Electric-lime neo-minimal finance

**Status:** Authoritative frontend visual and interaction specification

## 0. Authority and reference interpretation

This document translates the supplied visual references into GoalGuard's design language. The references define visual grammar only; their ProFinance brand, Apple marks, app-download patterns, stock-trading copy, partner logos, and sample balances must not be copied.

Product truth, safety boundaries, and canonical data contracts remain governed by `goalguard_prd.md`, especially Section 17. When a visual treatment conflicts with product truth or WCAG 2.2 AA, product truth and accessibility take precedence.

The intended result is:

> A spacious, approachable financial product with an adaptive light/dark canvas, decisive utility surfaces, electric-lime moments, oversized geometric typography, and GoalGuard-specific protection-orbit compositions.

This version deliberately replaces the previous warm editorial direction.

| Retired direction | Required direction |
|---|---|
| Instrument Serif and italic emphasis | One confident geometric sans-serif family |
| Warm off-white and terracotta | Pure white, near-black, electric lime, cool neutrals |
| Architectural photography | Abstract geometry and truthful GoalGuard UI compositions |
| Floating glass navbar | Solid floating pill header with restrained elevation |
| Small editorial cards and thin rules | Large soft-gray modules and open whitespace |
| Luxury-publication tone | Clear, optimistic, product-first financial utility |
| Dark surfaces used sparingly as small cards | Dark surfaces used intentionally for data, safety, and major CTA bands |

Do not blend version 2.1 styling back into this system. In particular, do not reintroduce serif display text, terracotta, warm canvas tones, glassmorphism, or architectural imagery. The approved pill header is solid and readable, never translucent decoration.

## 1. Design principles

1. **Clarity before novelty.** Every screen makes the current state, source of data, next action, and value-movement boundary obvious.
2. **Whitespace is structural.** Use generous vertical rhythm and a small number of large elements instead of dense card collections.
3. **Lime is a surface, not decoration.** Use it for the hero, selected emphasis, icon discs, and high-attention regions with near-black content.
4. **Black creates confidence.** Use near-black for primary actions, exact transaction facts, safety modules, and major conversion bands.
5. **Product visuals explain the product.** Prefer abstract shapes and factual interface fragments over photography or generic finance imagery.
6. **Familiar Web2 patterns support Web3 trust.** Forms, navigation, confirmations, errors, and disclosures must work like established consumer-finance interfaces.
7. **One dominant action per view.** Secondary actions remain visually subordinate and Back actions are predictable.
8. **No invented finance.** Production UI displays only validated server-authoritative, wallet-read, or blockchain-derived values.
9. **Status is explicit.** Never rely on color alone; pair status color with an icon and plain-language label.
10. **Accessibility is part of the visual system.** Meet WCAG 2.2 AA, visible focus, keyboard operation, 44px targets, reduced motion, and 200% zoom.

## 2. Token architecture

Use three layers: primitive values, semantic aliases, and component tokens. Components consume semantic or component tokens only—never raw hex values.

### 2.1 Primitive tokens

```css
:root {
  /* Neutral primitives */
  --white: #ffffff;
  --black: #0b0c0a;
  --ink: #171816;
  --ink-soft: #4f514c;
  --gray-50: #f8f8f6;
  --gray-100: #f2f3f0;
  --gray-200: #e5e7e2;
  --gray-300: #cfd2cb;
  --gray-500: #666963;

  /* Brand primitives */
  --lime-400: #c9f52b;
  --lime-300: #d8f95b;
  --lime-100: #efffb9;

  /* Semantic status primitives */
  --green-700: #17663f;
  --green-100: #dff5e8;
  --amber-700: #805600;
  --amber-100: #fff0c2;
  --red-700: #a83936;
  --red-100: #fde5e3;

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
  --space-12: 192px;

  /* Shape */
  --radius-control: 12px;
  --radius-card: 28px;
  --radius-feature: 40px;
  --radius-section: 52px;
  --radius-pill: 999px;

  /* Motion */
  --duration-press: 80ms;
  --duration-exit: 150ms;
  --duration-enter: 220ms;
  --duration-emphasis: 420ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);

  /* Elevation */
  --shadow-header: 0 1px 0 rgb(11 12 10 / 0.07);
  --shadow-float: 0 18px 50px rgb(11 12 10 / 0.12);
  --shadow-float-strong: 0 28px 80px rgb(11 12 10 / 0.18);
}
```

### 2.2 Semantic tokens

```css
:root {
  --background: var(--white);
  --surface: var(--white);
  --surface-subtle: var(--gray-50);
  --surface-muted: var(--gray-100);
  --surface-strong: var(--black);

  --foreground: var(--ink);
  --foreground-soft: var(--ink-soft);
  --foreground-muted: var(--gray-500);
  --foreground-on-strong: var(--white);

  --border: var(--gray-200);
  --border-strong: var(--gray-300);
  --border-on-strong: rgb(255 255 255 / 0.16);

  --accent: var(--lime-400);
  --accent-hover: var(--lime-300);
  --accent-soft: var(--lime-100);
  --accent-foreground: var(--black);

  --positive: var(--green-700);
  --positive-surface: var(--green-100);
  --warning: var(--amber-700);
  --warning-surface: var(--amber-100);
  --negative: var(--red-700);
  --negative-surface: var(--red-100);

  --focus-ring: var(--black);
  --focus-offset: var(--accent);
}
```

### 2.3 Component tokens

```css
:root {
  --navbar-bg: var(--white);
  --navbar-fg: var(--foreground);
  --navbar-border: var(--border);

  --hero-bg: var(--accent);
  --hero-fg: var(--accent-foreground);

  --button-primary-bg: var(--black);
  --button-primary-fg: var(--white);
  --button-primary-hover: #252622;
  --button-accent-bg: var(--accent);
  --button-accent-fg: var(--accent-foreground);
  --button-secondary-bg: var(--surface-muted);
  --button-secondary-fg: var(--foreground);

  --input-bg: var(--white);
  --input-fg: var(--foreground);
  --input-border: var(--gray-300);
  --input-placeholder: var(--foreground-muted);

  --feature-card-bg: var(--surface-subtle);
  --feature-card-fg: var(--foreground);
  --data-card-bg: var(--surface-strong);
  --data-card-fg: var(--foreground-on-strong);
  --footer-bg: var(--surface-strong);
  --footer-fg: var(--foreground-on-strong);

  --pip-body: var(--accent);
  --pip-purpose: var(--accent);
  --pip-highlight: var(--lime-300);
  --pip-armour: #1b1d19;
  --pip-armour-highlight: #292c25;
  --pip-scale-light: #4a4d43;
  --pip-soft-shadow: var(--black);
  --pip-contact-shadow: rgb(11 12 10 / 0.12);
  --pip-outline: var(--black);
  --pip-eye: var(--white);
  --pip-feature: var(--black);
  --pip-belly: var(--white);
  --pip-warning: var(--negative);
  --pip-warning-surface: var(--negative-surface);
  --pip-armour-on-dark: var(--white);
  --pip-outline-on-dark: var(--white);
  --pip-mark-on-lime: var(--black);
}
```

The only permitted component-level literal above is the primary-button hover color. Move it into primitives if more than one component uses it.

### 2.4 Dark appearance

- Appearance supports `system`, `light`, and `dark`; System is the default.
- Explicit Light or Dark choice persists in the non-sensitive `goalguard-theme` cookie. Returning to System removes the override.
- Apply the resolved theme before first paint and update `color-scheme`; System continues listening to operating-system changes.
- Dark mode uses `#0d100c` canvas, `#121610` surface, `#181d15` raised surface, `#f3f5ec` foreground, and `#c1c7b9` supporting text. Borders use `#343b30` and `#505a48`.
- Lime stays `#c9f52b`, but is used as a bounded surface or action. Do not add glow, neon text, or luminous grid effects.
- Components consume semantic surface and content tokens. `--white` and `--black` remain stable primitives for deliberate artwork only, not adaptive app surfaces.

### 2.5 Color usage and accessibility

- White is the dominant page canvas.
- Near-black is the dominant text color and the default primary-action surface.
- Electric lime may fill large areas, but content on lime is always near-black.
- Never use lime text on white or light-gray surfaces.
- `--foreground-soft` is the default supporting-text color. `--foreground-muted` is reserved for large text, disabled states, or nonessential metadata only after contrast verification.
- Status colors are semantic only. They never decorate unrelated content and always accompany text or an icon.
- Normal text contrast is at least 4.5:1; large text and meaningful non-text boundaries are at least 3:1.
- Focus indicators use a 2px near-black ring plus a 2px lime offset on light surfaces. On dark surfaces, reverse the two colors.

## 3. Typography

Load `Manrope` through `next/font`. Use it for display, body, controls, labels, addresses, IDs, and financial values. Do not load or use a serif family.

```css
:root {
  --font-sans: "Manrope", "Helvetica Neue", Arial, sans-serif;
}

body {
  font-family: var(--font-sans);
}
```

| Role | Size | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|
| Display XL | `clamp(60px, 7vw, 108px)` | 500 | 0.92 | `-0.055em` |
| Display L | `clamp(52px, 5.8vw, 88px)` | 500 | 0.95 | `-0.05em` |
| H1 | `clamp(44px, 5vw, 76px)` | 500 | 0.98 | `-0.045em` |
| H2 | `clamp(40px, 4.3vw, 64px)` | 500 | 1 | `-0.04em` |
| H3 | `clamp(26px, 2.6vw, 36px)` | 550 | 1.1 | `-0.025em` |
| Lead | `clamp(18px, 1.6vw, 24px)` | 400 | 1.48 | `-0.015em` |
| Body | 16px | 400 | 1.6 | `-0.01em` |
| Body small | 14px | 400 | 1.55 | 0 |
| Label/navigation | 14px | 550 | 1.4 | `-0.01em` |
| Metadata | 12px | 550 | 1.45 | `0.02em` |
| Financial value | `clamp(28px, 3vw, 48px)` | 500 | 1 | `-0.035em` |

Typography rules:

- Headlines use sentence case, tight tracking, and intentional two- or three-line wrapping.
- Do not italicize conceptual words or mix typefaces for emphasis.
- Bold only the phrase that carries decision value; avoid full paragraphs in heavy weight.
- Financial values, countdowns, balances, addresses, chain IDs, and request IDs use `font-variant-numeric: tabular-nums`.
- Long identifiers use `overflow-wrap: anywhere` and retain copy affordances.
- Supporting text never drops below 12px; mobile body and form controls remain at least 16px.

## 4. Layout and rhythm

- Outer page maximum width: 1540px.
- Reading and workflow maximum width: 1280–1400px depending on density.
- Desktop grid: 12 columns; tablet: 8 columns; mobile: 4 columns or one reading column.
- Desktop gutters: 32px; tablet: 28–32px; mobile: 20px.
- Grid gap: 24–32px desktop and 16–20px mobile.
- Major sections use `padding-block: clamp(96px, 10vw, 176px)`.
- Related workflow regions may use 56–80px vertical separation.
- Long prose stays within 55–70 characters per line.
- Open whitespace is preferred over decorative separators.
- Do not force all content above the fold. The first viewport should establish the purpose, primary action, and preview-only boundary.

Preferred compositions:

- hero: 7/5 content-to-product-visual split;
- feature modules: two wide horizontal cards;
- advantages: two-column list with generous row gaps;
- purpose/data section: 6/6 split with text and abstract UI composition;
- conversion band: large black rounded section with asymmetrical content;
- final CTA: centered, sparse, followed by a rounded-top black footer.

## 5. `FloatingEditorialNavbar`

The navigation is a solid floating capsule shared by the landing page, workflow, and development preview. It borrows the sample's calm spacing while the guard-point mark, explicit preview status, appearance selector, and workflow context make it distinctly GoalGuard.

### 5.1 Information architecture

Desktop order:

```text
GoalGuard | How it works | Trust & safety | Live foundations | Preview only | Connect wallet | Start a goal
```

- Brand links to `#top`.
- Section links point only to real anchors.
- `Preview only` is a non-interactive status label.
- Wallet control is secondary.
- `Start a goal` is the one black pill CTA and links to `#goal-composer`.
- Do not add fictional login, signup, app-download, catalog, pricing, or account routes to match the reference.

### 5.2 Desktop specification

```css
.floating-editorial-navbar {
  position: sticky;
  inset-block-start: 0;
  z-index: 50;
  width: 100%;
  padding: max(12px, env(safe-area-inset-top)) 16px 0;
}

.floating-editorial-navbar__inner {
  width: min(100%, 1540px);
  min-height: 64px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  border: 1px solid var(--navbar-border);
  border-radius: var(--radius-pill);
  color: var(--navbar-fg);
  background: var(--navbar-bg);
  box-shadow: var(--shadow-navbar);
}
```

- No backdrop blur, transparency, gradient, glow, or animated height.
- Brand is left-aligned, primary links are centered, and utilities are right-aligned at 1200px and wider.
- The logo uses the lime guard-point mark: a compact shield within an orbit point, not the sample's plain dot.
- Links are plain text with generous spacing, not individual pills.
- Active state combines darker text and a 2px underline or bottom marker.
- Theme, wallet, menu, and the primary CTA are individually operable controls inside the shared capsule.
- After scrolling, elevation may strengthen without changing size or hiding the header.
- Workflow mode replaces marketing links with a concise current-stage label and preserves the Preview only status.

### 5.3 Mobile specification

Below 768px:

```text
GoalGuard | Appearance | Menu
```

- Header inner height: 60px; viewport inset: 8px on narrow phones.
- Move navigation, wallet control, and CTA into one accessible menu sheet.
- Menu trigger exposes `aria-expanded` and `aria-controls`.
- The sheet traps focus, closes on Escape and outside press, locks background scroll, and restores focus to the trigger.
- Links and controls have at least 44px targets.
- At 200% zoom, switch to this layout before items clip or wrap unpredictably.

Between 768px and 1199px, use the compact capsule: keep brand, status, appearance, and menu/action controls visible while moving secondary links into the sheet. The full desktop row begins only at 1200px.

## 6. Hero system

The hero is the clearest visual translation of the references.

### 6.1 Structure

```text
White page canvas
└─ Large electric-lime rounded hero panel
   ├─ Purpose-led GoalGuard headline
   ├─ One concise explanation
   ├─ Primary black action + optional text link
   └─ Layered GoalGuard product composition
```

- Panel radius: 48–56px desktop, 28–32px mobile.
- Content determines height through 1199px. Do not force a viewport-taller hero. At 1200px and wider the composition may use a balanced minimum height only when both columns remain readable.
- Internal padding: `clamp(32px, 5vw, 80px)`.
- Headline width: roughly 7 columns and no more than three lines on wide desktop; natural wrapping takes priority below that range.
- Primary CTA uses black/white. A secondary text link may sit beside it when it points to a real section.
- Preserve the goal composer as the product's primary action; do not replace it with an app-download motif.

### 6.2 Product composition

Use layered HTML/CSS and simple inline SVG as a GoalGuard protection orbit:

- one raised “purpose attached” panel linked visually to the user's cost, loss, and deadline guardrails;
- one near-black independent-review panel overlapping it;
- optional floating chips for floor, expiry, coverage, or council result only when backed by canonical data;
- large lime-black-white abstract arcs or rounded shapes behind the panels;
- one or two thin hand-drawn-style SVG strokes as quiet directional accents.

No stock photo, architectural photo, phone screenshot, coin imagery, candlestick dashboard, Apple mark, or invented portfolio chart. Production mockups must render real current state or content-safe generic labels such as “Protection floor” without invented numeric values.

On mobile, remove fragile overlap, keep the artwork compact, and stack the composer before the protection orbit in reading and focus order. On fine pointers only, the orbit may tilt by at most 4 degrees and resets immediately on leave. Coarse pointers and reduced-motion mode remain static.

## 7. Surfaces, cards, and illustrations

### 7.1 Surface families

1. **Open content:** white canvas, no box, large whitespace.
2. **Feature module:** very light neutral fill, 32–40px radius, no border or shadow by default.
3. **Data module:** near-black fill, white text, 24–32px radius, compact factual hierarchy.
4. **Lime module:** lime fill, near-black text, used for selection, protection, or a major narrative moment.
5. **Floating UI chip:** white or black, 12–16px radius, restrained `--shadow-float`, used only inside an illustration composition.
6. **Major CTA band:** near-black, 48–56px radius, generous padding, white headline, one high-contrast action.

Do not turn every section into a card. A page should usually contain only one or two visually dominant filled sections.

### 7.2 Abstract illustration language

Use code-native shapes rather than generated imagery:

- cropped circles and semicircles;
- vertical capsules and irregular rounded blocks;
- thin single-weight line graphs or squiggles;
- concentric arcs for protection/coverage;
- floating factual UI rows;
- controlled overlap and clipping at module edges.

Illustrations use no more than white, black, lime, pale lime, and one semantic status color when the status is real. Decorative shapes are `aria-hidden="true"`; any meaningful visualization gets a nearby text equivalent.

## 8. Buttons, links, and controls

### 8.1 Button hierarchy

- **Primary on light/lime:** black background, white text, pill radius, 48–56px height.
- **Primary on dark:** lime or white background with near-black text. Choose one per section.
- **Secondary:** light-gray background, near-black text, 44–48px height, 10–12px radius or pill when paired with a primary pill.
- **Text link:** text plus Phosphor arrow icon; underline on hover/focus. Do not use typed arrow glyphs.
- **Icon button:** minimum 44×44px with an accessible name and visible focus.

All actions define default, hover, pressed, focus-visible, disabled, and loading states. Press feedback arrives within 100ms and never shifts layout. Loading preserves width, prevents duplicate submission, and announces activity.

### 8.2 Forms

- Use a visible label for every field; placeholders never replace labels.
- Default input height: 52–56px; textarea minimum height: 128px.
- Inputs use white fill, 1px neutral border, 12px radius, and 16px text.
- Group related financial fields under a clear heading and concise helper text.
- Validate after blur or submit, not on every keystroke.
- Inline errors name the problem and recovery. Multi-error forms include a focusable linked error summary.
- Preserve user-entered values on Back, retry, and safe workflow recovery.
- Confirmation checkboxes use a large combined label target and explicitly restate the unsigned-preview boundary.

## 9. Icons and status

- Use Phosphor outline icons at one consistent weight.
- UI icons: 16–20px; feature icons: 20–24px.
- Feature icons may sit in 56–64px lime or pale-lime circles, matching the references.
- Do not use emoji, mixed icon families, 3D icons, or generic crypto glyphs.
- Decorative icons beside visible text are hidden from assistive technology.
- Success, warning, rejection, and expiry always combine icon, label, and explanation.

### 9.1 Pip mascot system

Pip the Pangolin is GoalGuard's selected 2D brand companion. The production colourway is Electric Lime: lime body, white belly, and near-black armour and features on every expressive full-character surface. Reversed white armour is reserved for the compact identity mark on dark surfaces; the black-only micro-mark is used on lime.

The canonical full-character geometry is documented in `design/pip-model-bible/README.md`, and `design/pip-model-bible/masters/pip-v1-preferred-turnaround.png` is the visual authority. Preserve its dimensional 2D rendering, lime anatomy, white belly, dense near-black scales, facial landmarks, feet, tail root, and left-flank purpose mark; pose novelty never overrides character consistency. Do not translate it into a separate flat-vector character or add a black perimeter stroke around the lime anatomy. Product pages use the approved transparent derivatives in `public/media/pip-v1/poses`, selecting the expression and posture that matches the actual state. Present Pip as a transparent cutout. Full-body artwork may use one soft ground ellipse beneath the feet; cropped artwork has no shadow. Do not add circular stages, frames, silhouette shadows, signal lines, activity dots, badges, or decorative baselines around the mascot.

- Use `PipMark` for normal brand identity in the navbar, footer, app icon, and small product-brand placements.
- Use one expressive `PipMascot` per active view at most. Approved poses are neutral, listening, checking, explaining, attentive, safe-stop, and ready.
- Match the pose to explicit interface state supplied by the parent. Pip never fetches data, infers financial state, or changes workflow behavior.
- Pip may respond to focus, selection, acknowledgment, request activity, and stage entry. It is not directly clickable or focusable and never follows the cursor.
- Keep Pip out of financial metrics, scenarios, transaction data, protocol facts, individual council verdicts, repeated rows, and read-only audit surfaces.
- Ready means an unsigned preview is available to inspect. Do not use cheering, confetti, profit imagery, or any pose that implies protection was executed.
- Decorative instances are hidden from assistive technology. Visible text and semantic status components remain the sole source of state meaning.
- On compact screens, reduce the mascot before reducing or obscuring form, status, or action content.

## 10. Motion

Motion is supportive, brief, and limited to transform and opacity.

- Press response: `--duration-press`.
- Exit: `--duration-exit`.
- Panel entry: `--duration-enter`.
- Hero composition entry: up to `--duration-emphasis`.
- Card stagger: at most 35ms.
- Product modules may shift 2–4px on hover for fine pointers; never use constant bobbing.
- No scroll hijacking, marquee, continuous parallax, layout animation, or decorative loading loop.
- Progress animation runs only while the corresponding request is active.

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

## 11. GoalGuard workflow translation

The product workflow uses the same visual system without becoming a marketing page.

### 11.1 Shared shell

- White canvas and flat sticky product header.
- Desktop five-step rail with black text and a lime active marker.
- Mobile summary reads “Step n of 5 · Current stage”; do not horizontally scroll all five steps.
- Primary task content is an open composition or one large light-gray module.
- Near-black panels hold exact cost, allowance, calldata, chain, request IDs, and other high-attention facts.
- One primary button per stage; Back and recovery actions are visually quieter.

### 11.2 Stage styling

- **Define goal:** large friendly form with visible labels and lime selection states.
- **Live options/searching:** abstract protection arcs and truthful activity messaging; no fake percentage.
- **Council review:** three spacious role rows/cards with verdict icon and text, not three visually identical glowing tiles.
- **Approved plan:** open goal summary plus light-gray scenario module; directly label down/flat/up outcomes and provide semantic text.
- **Confirming preview:** large exact-facts layout, with the maximum cost at risk and unsigned-only statement adjacent to the acknowledgment.
- **Generating preview:** retain the confirmation context and show what source is active and what happens next.
- **Demo ready:** a major near-black “Protection Plan Ready (Demo)” section paired with light factual cards. State “No funds moved; no protected position was created” prominently.
- **Errors and recovery:** white or soft-gray surface with explicit cause, affected data, and one safe recovery action. Semantic red is reserved for the status label/icon.

The P0 frontend must never expose a signing, transaction-send, or broadcast action.

## 12. Web3 trust and transparency

Apply Web3 UX principles through familiar behavior and explicit information.

- Explain what GoalGuard is doing, which source is involved, what happens next, and whether the action can move value.
- Label live market facts as Thetanuts/Base-derived and show `marketAsOf` where available.
- Distinguish wallet-read data, blockchain-derived values, deterministic GoalGuard calculations, and Gonka AI review.
- Explain each council role, verdict, concerns, disclosures, model, and copyable request ID.
- Before preview generation, show exact cost, maximum cost at risk, coverage, expiry conditions, wallet, network, and the unsigned-only boundary.
- Separate allowance requirements from proposed execution transaction data.
- State clearly that P0 creates no signature, broadcast, protected position, or on-chain event.
- Explain stale candidate, quote expiry, insufficient balance, changed wallet/network, council rejection, and preview failure with a safe recovery path.
- Do not imply partners, endorsements, guarantees, community consensus, or performance beyond canonical facts.
- Historical audit IDs, timestamps, and decisions remain preserved and readable.

## 13. Responsive behavior

Layout is fluid from 320px upward. Validate at 320, 360, 375, 430, 768, 912, 1024, 1280, 1440, and 1920px, plus representative phone landscape and effective 200% zoom.

- **Wide desktop ≥1200px:** 12-column hero with a 7/5 split, full pill navigation, oversized headings, and bounded illustration overlap.
- **Tablet and compact desktop 768–1199px:** single-column hero with a readable composer capped near 768px, compact navigation, reduced headline scale, and component-driven card columns.
- **Mobile 480–767px:** one reading column, 20px gutters, stacked modules, and simplified product overlap.
- **Compact mobile 320–479px:** 16px gutters, 44–52px hero heading, smaller radii and section spacing, and no rotation or off-screen composition.
- Component grids use container queries or auto-fit sizing so behavior follows available space rather than the viewport alone.
- Large rounded sections reduce radius and padding proportionally on small screens.
- Controls remain at least 44×44px with at least 8px separation where accidental activation is plausible.
- No horizontal document overflow. Wide identifiers wrap; structured transaction data may use an explicitly labelled internal scroll region only when unavoidable.
- Content and focused controls must not be hidden beneath the sticky header.

## 14. Page architecture

Landing-page rhythm:

```text
Solid floating pill navbar
Electric-lime hero + goal composer + GoalGuard protection orbit
Large “How protection works” heading
Two wide soft-gray explanation modules
Open two-column trust/safety advantages list with lime icon discs
Centered “Live foundations” strip for Gonka, Thetanuts, and Base
Split purpose/data story with abstract lime geometry and factual UI rows
Large near-black preview-only safety band
Centered start-goal CTA
Rounded-top near-black footer
```

This sequence is a visual rhythm, not permission to create unsupported routes, claims, statistics, logos, or partner language. Use “Live foundations” or another factually accurate label rather than “Our partners.”

## 15. Component inventory

```text
Layout:      PageContainer, Section, Grid, SplitLayout, Stack, Cluster
Navigation:  FloatingEditorialNavbar, GoalGuardBrand, ThemeSelector, MobileNavigation
Typography:  DisplayHeading, SectionHeading, LeadText, BodyText, Metadata, FinancialValue
Actions:     PrimaryButton, SecondaryButton, TextLink, IconButton, CopyButton
Marketing:   LimeHero, FeatureModule, AdvantageItem, FoundationRail, DarkCTABand
Illustration: ProtectionOrbit, AbstractArc, DataChip, DirectionalStroke
Workflow:    StageShell, MetricCard, TrustRail, ScenarioComparison, CouncilCard
Preview:     UnsignedTransactionCard, PreviewSafetySummary, ExpiryStatus
Utility:     Divider, StatusBadge, Alert, Drawer, Accordion, ErrorSummary
```

Create a reusable component only when it serves a real production state. Do not build generic stock-trading, portfolio, login, catalog, app-download, or partner-logo components merely to resemble the references.

## 16. Implementation rules

1. Treat this file as the frontend visual source of truth after the PRD.
2. Implement tokens in `src/styles/tokens.css` using primitive → semantic → component layers.
3. Import tokens from `src/app/globals.css`; keep resets, base elements, accessibility utilities, and reduced-motion rules there.
4. Use Tailwind CSS v4 utilities against CSS variables; do not scatter arbitrary values through components.
5. Load Manrope through `next/font`; remove active Instrument Serif usage.
6. Reuse existing accessible primitives and Phosphor icons before creating new controls.
7. Keep landing content server-rendered. Client boundaries are limited to actual interactions such as the menu, wallet, composer, copy controls, and workflow state.
8. Use inline SVG/CSS for abstract art; do not add a heavy illustration, WebGL, or charting dependency.
9. Do not use raw hex values, arbitrary radii, arbitrary shadows, gradients, or backdrop blur in component files.
10. Do not ship links to sections or routes that do not exist.
11. Preserve canonical contract parsing, workflow error details, server-authoritative state, and the unsigned-preview safety boundary.
12. The prior architectural hero asset must not appear in the active landing design. Its removal from the repository is a separate cleanup decision.
13. Resolve System/Light/Dark before paint without reading the cookie in the server layout; preserve static landing generation.

## 17. Anti-patterns

Reject a screen if it contains any of the following:

- serif or italic display typography;
- warm beige/terracotta styling;
- a translucent or glass pill navbar, glow, or decorative blur;
- architectural, laptop, coin, or generic finance stock imagery;
- neon-on-dark cyber styling, grids, glows, or holographic effects;
- excessive small cards, badges, borders, shadows, or nested pills;
- lime used as small text on white;
- app-store/download language, fake login routes, or copied ProFinance content;
- invented balances, returns, market charts, partner logos, or endorsements;
- color-only status, hidden labels, sub-44px targets, or motion required for comprehension;
- signing, broadcasting, or live-execution actions in P0.

## 18. Acceptance checklist

### Visual match

- [ ] Light mode uses a dominant white canvas; dark mode uses layered near-black surfaces. Electric lime creates the shared brand contrast.
- [ ] Manrope drives all hierarchy; no serif or italic editorial styling remains.
- [ ] Landing, workflow, and preview lab share the solid floating pill header without wrapping or clipping.
- [ ] The hero is a large rounded lime panel with an oversized sans headline and one dominant black action.
- [ ] Product-led abstract compositions replace architectural photography.
- [ ] Feature cards are large, soft-gray, sparse, and mostly shadowless.
- [ ] Lime/pale-lime icon discs and black CTA/data bands create the reference rhythm.
- [ ] The final CTA and footer use generous white space and a large rounded black surface.

### Product integrity

- [ ] All navigation labels, actions, foundations, and claims are true for GoalGuard.
- [ ] No ProFinance, Apple, app-download, stock-catalog, or fictional partner content remains.
- [ ] No production visual displays invented financial values or market performance.
- [ ] Live values identify their source and timestamp where available.
- [ ] AI review is visually and verbally distinct from deterministic calculations.
- [ ] Preview-only screens state that no signature, broadcast, position, or on-chain event exists.

### Accessibility and UX

- [ ] Normal text contrast is at least 4.5:1 and meaningful boundaries at least 3:1.
- [ ] Body and form text is at least 16px on mobile; supporting text is never below 12px.
- [ ] All controls are keyboard operable, visibly focused, and at least 44×44px.
- [ ] Forms have visible labels, persistent values, linked inline errors, and an error summary where needed.
- [ ] Status uses icon plus text, never color alone.
- [ ] Reduced motion, 200% zoom, 320px width, and no-horizontal-overflow checks pass.
- [ ] Meaningful charts or comparisons have direct labels and semantic text/table equivalents.
- [ ] System, Light, and Dark appearance choices are keyboard accessible; explicit choice survives reload and System follows OS changes.

### Validation

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] Axe scans and deterministic screenshots at 375px, 768px, 1024px, and 1440px
