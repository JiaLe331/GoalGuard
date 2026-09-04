# Pip mascot system — selected direction

> **Canonical geometry update (2026-09-03):** `design/pip-model-bible/masters/pip-v1-preferred-turnaround.png` is the visual authority. It replaces the rejected programmatic `pip-v1-01` study. Every posture must preserve the preferred character's proportions, face, fixed armour flow, belly, tail root, and left-flank mark; only expression, arms, and removable state accessories may change. This file remains the product-placement and behavior specification.

**Decision:** Pip the Pangolin in Electric Lime is the selected GoalGuard mascot and production colour direction.

Pip is GoalGuard’s calm pangolin companion. The character makes unfamiliar protection concepts feel approachable while preserving the product’s factual, preview-only boundary. Visual consistency with the canonical turnaround takes priority over novelty in any individual pose.

## Brand role

- **Warm:** Pip acknowledges that the money represents rent, tuition, travel, or another human purpose.
- **Observant:** the single focused eye communicates attention without the exaggerated expression of a game character.
- **Patient:** Pip explains and waits; it does not rush the user toward an action.
- **Neutral:** Pip never predicts a market outcome, recommends a trade, celebrates gains, or represents the Gonka council.

The three dark scale modules represent bounded protection. The short right-facing snout and rear purpose ring now persist from the compact mark through the head and full-character artwork, giving Pip one recognizable construction without using an arrow, chart, shield, lock, or coin.

## Responsive identity

| Context | Asset | Minimum size |
| --- | --- | ---: |
| Primary navbar or footer | `PipMark` beside the GoalGuard wordmark | 120px wide |
| Square brand placement | `lockup-stacked.svg` | 120px wide |
| Marketing or education | `mascot-head.svg` | 48px |
| Product UI and favicon | `PipMark` / `favicon.svg` | 20px UI; 16px browser favicon |
| Compact product companion | `PipMascot` size `sm` | 80px tall, restrained crop of the active approved pose |
| Small staged character | `PipMascot` size `sm`, form `full` | 80–96px tall with a reserved baseline |
| Full character illustration | `PipMascot` size `md` or `lg` | 128px tall |

Use the compact crop of the active approved pose for dense explanatory UI. The full pose may be used at 80–96px only when the surrounding layout reserves a clear baseline; it never replaces the micro-mark in navigation.

## Product placement

### Appropriate

- Landing goal composer: neutral or listening Pip.
- Live-option search: checking Pip only while the request is active.
- Council education: explaining Pip beside introductory copy, never inside verdict cards.
- Recoverable errors: safe-stop Pip beside cause and recovery action.
- Preview confirmation: attentive Pip near the acknowledgment boundary, not the cost figures.
- Demo-ready: calm acknowledgement with the explicit text “No funds moved; no protected position was created.”

### Excluded

- Financial tables and metric cards.
- Exact allowance, calldata, target, chain ID, timestamps, or request IDs.
- Council verdict icons or disclosures.
- Toasts, repeated list rows, and routine button decoration.
- Any state that could make Pip appear to guarantee protection or celebrate an unsigned preview as execution.

## Expression language

| Pose | Visual cue | Meaning supplied by adjacent text |
| --- | --- | --- |
| Listening | Head tilt, hand near cheek, warm attentive eyes | Goal entry is waiting for the user |
| Checking | Downward gaze, thoughtful brow, hand under chin | A named backend request is active |
| Explaining | Open palm and conversational expression | The product is clarifying a concept |
| Safe stop | Raised open palm and calmly concerned brow | Nothing moved; a recovery action is available |
| Attentive | Focused gaze while holding the plain review tile | Review exact facts before confirmation |
| Ready, calmly | Settled smile and gentle presenting hand | The unsigned preview is available to inspect |

Expression is never the sole state indicator. The UI must include explicit status text and an appropriate semantic role.

## Accessibility

- Use `aria-hidden="true"` when Pip is decorative beside equivalent visible text.
- For meaningful illustrations, use concise alt text describing Pip’s role, not its appearance alone.
- Do not put text inside the character artwork in production assets.
- Preserve a minimum 3:1 non-text contrast for meaningful visual boundaries.
- Do not rely on lime, eye direction, or pose to communicate status.
- Reserve layout dimensions before loading the artwork to avoid content shift.

## Motion specification

Motion is optional and applies only to transform and opacity.

| State | Motion | Timing |
| --- | --- | --- |
| Listening | Head inclines 2° toward the composer, then settles | 220ms spring on focus entry |
| Checking | One subtle 1px attention shift on stage entry | 220ms |
| Explaining | Pose enters with the shared restrained transition | 220ms |
| Safe stop | Pip enters with an 8px upward translation and fade | 220ms; no shake |
| Confirmation | Document tile scales from 0.96 to 1 once | 180ms |
| Demo-ready | One subtle 2px downward nod | 180ms; no loop or confetti |

All motion is interruptible and has a static `prefers-reduced-motion` treatment. There is no continuous idle animation.

## Colour harmony and reproduction

### Selected product colourway — Electric Lime

| Role | Token/value | Use |
| --- | --- | --- |
| Body | `--lime-400` / `#C9F52B` | Pip's primary body fill on light and dark neutral surfaces |
| Purpose point | `--lime-400` / `#C9F52B` | Persistent purpose signal inside the white belly field |
| Armour and features, light surfaces | `--black` / `#0B0C0A` | Scales, outline, eye, brow, nose, and mouth |
| Armour, dark surfaces | `--white` / `#FFFFFF` | Reversed scales for compact identity artwork only |
| Neutral surface | `--gray-100` / `#F2F3F0` | Illustration-stage background where needed |
| Safe-stop status | `--negative` and `--negative-surface` | Status disk only, always paired with visible error text |

This high-contrast duotone draws entirely from existing GoalGuard primitives. Electric lime makes Pip immediately recognizable as GoalGuard; varied posture, restrained expressions, and the shared three-scale-and-snout silhouette provide differentiation without introducing an unrelated mascot palette. The purpose ring replaces the earlier chest monogram so the mascot does not compete with the primary mark.

### Archived alternates from evaluation

- **Soft Lime:** `#EFFFB9` body, `#0B0C0A` armour, `#C9F52B` purpose point. Former recommendation retained as an exploration only.
- **Cloud Neutral:** `#F2F3F0` body, `#0B0C0A` armour, `#C9F52B` purpose point. Archived product alternate.
- **Meadow Mint:** `#BFE8D0` body, `#173C30` armour, `#C9F52B` purpose point. Mascot-illustration extension only; do not add these colours to core UI without a design-system decision.
- **Quiet Periwinkle:** `#CFD8FF` body, `#202A4D` armour, `#C9F52B` purpose point. Campaign exploration only; not approved for core product UI.

Use full-colour Electric Lime Pip as a transparent cutout on white, cool-neutral, lime, and near-black product surfaces. Full-body artwork may use the shared soft ground ellipse beneath the feet. Cropped artwork has no shadow, preventing its crop boundary from becoming visible. Do not add circular stages, frames, or silhouette shadows. The reversed white treatment is reserved for compact identity artwork. Do not use status colours as decoration, recolour individual scales independently, add gradients, rotate the lockup, or place Pip over busy imagery.

See `pip-colour-harmony.html` and `pip-colour-harmony.png` for the visual comparison.

## Production component contract

The approved transparent pose exports live in `public/media/pip-v1/poses`. The production component must select the pose that matches the actual workflow state and use adjacent text as the explicit status indicator. Do not add surrounding signal graphics or reconstruct the approved character with new inline SVG anatomy.

If Pip is approved for production, expose one presentation-only component:

```ts
type PipMascotProps = {
  pose: "neutral" | "listening" | "checking" | "explaining" | "attentive" | "safe-stop" | "ready";
  size?: "sm" | "md" | "lg";
  form?: "compact" | "full";
  surface?: "light" | "dark" | "lime";
  active?: boolean;
  decorative?: boolean;
};
```

The component must not fetch data, infer workflow state, announce status by itself, or alter reducer transitions.
