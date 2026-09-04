# Pip the Pangolin — canonical model bible

Version: pip-v1.2  
Status: preferred visual reference with approved expressive pose set  
Canonical turnaround: masters/pip-v1-preferred-turnaround.png

## Authority

The user-selected turnaround above is the visual authority for Pip. It replaces the earlier programmatic pip-v1-01 study, which is retained only in archived/generated-v0/ for history and must not be used for new artwork.

When another asset, pose, or implementation differs from the preferred turnaround, the preferred turnaround wins. New poses must look like the same character changing posture—not a fresh interpretation of a pangolin.

## Identity locks

- Cute, gender-neutral, approximately three-head-tall proportions.
- Large rounded lime head; short continuous muzzle; two nostrils; calm small smile.
- Two large white eyes with black pupils and small white highlights.
- Compact lime torso, white chest and belly, short capable arms, broad planted hind feet.
- Dense near-black leaf-shaped scales from crown around both sides of the body and along the tail.
- Long lime tail rooted visibly at the pelvis, with scales on its upper surface.
- White purpose ring on Pip's left flank (viewer-right in the canonical front view).
- Three readable dark claw tips per hand or foot at application size.

These proportions, landmark positions, armour cadence, tail root, and flank mark are invariant. Do not mirror the front asset to create a side-specific asset.

## Rendering locks

Pip is dimensional 2D. Preserve the selected turnaround's soft rendered volume rather than translating it into a separate flat-vector character:

- no added black perimeter stroke around the lime head, muzzle, body, limbs, or tail;
- preserve the turnaround's restrained lime highlight, form shading, charcoal scale depth, and neutral contact shadow;
- do not add new gradients, texture noise, glow, painterly effects, or independently outlined scale plates;
- near-black remains valid for armour, claws, pupils, eyebrows, nostrils, and mouth.

On every UI surface, keep Pip's original colours and present the expressive character as a transparent cutout. Full-body artwork may use one soft ground ellipse beneath the feet. Cropped artwork has no shadow because a silhouette shadow would expose the crop boundary. Do not place the character inside a circular stage or decorative frame. Colour reversal is reserved for the compact PipMark.

## Runtime derivation

`src/components/brand/pip-mascot.tsx` is the approved pose-backed application integration. Each state loads a transparent pose derivative created from the canonical turnaround. The set changes posture and expression while preserving the locked anatomy, armour, tail, palette, and purpose ring.

The public API remains stable: `PipPose`, `PipSurface`, `PipSize`, and `PipForm`. The full form presents the complete pose. The compact form uses a restrained crop of that same pose so the face remains readable at small sizes. State is communicated by the pose and adjacent text, without separate signal lines, activity dots, badges, or decorative baselines.

## Product-state mapping

| Pose | Intended use | Prohibited implication |
| --- | --- | --- |
| neutral | General introduction | Recommendation or endorsement |
| listening | Goal input is awaiting the user | Continuous monitoring |
| checking | A named backend request is active | Fabricated progress percentage |
| explaining | Clarifying product or council behavior | Individual council verdict |
| attentive | Review before preview confirmation | Approval on the user's behalf |
| safe-stop | Recoverable failure beside explicit text | Loss, blame, or panic |
| ready | Unsigned preview is available to inspect | Execution, protection, profit, or celebration |

Only one expressive Pip appears in an active view. Pip remains absent from financial metrics, scenarios, transaction fields, audit records, repeated rows, and final factual disclosures.

## Asset inventory

- masters/pip-v1-preferred-turnaround.png: immutable preferred visual reference copied from the approved attachment.
- public/media/pip-v1/reference/pip-v1-01-turnaround.png: public copy of the same approved reference.
- public/media/pip-v1/poses/: approved transparent neutral, listening, checking, explaining, attentive, safe-stop, and ready derivatives.
- src/components/brand/pip-mascot.tsx: pose selection, compact presentation, and surface-aware contact shadow.
- manifest.json: authority, identity locks, API mapping, and source inventory.
- archived/generated-v0/: superseded generated artwork; historical only.

Future front, back, profile, three-quarter, top, underside, expression, and pose sheets must be reconstructed from the preferred turnaround and reviewed against these locks before entering public/media.

## Acceptance

- Confirm every runtime state resolves to its named asset in the approved pose set.
- Confirm every pose remains recognizably the canonical character, with the locked purpose ring and armour flow.
- Confirm no circular frame or supplemental signal graphics surround the mascot.
- Confirm both feet remain planted and the tail remains attached in every pose.
- Confirm the white purpose ring stays on Pip's left flank.
- Confirm armour remains near-black on light, dark, and lime surfaces.
- Test facial readability at 80–96px and full-body readability at 128–176px.
- Respect reduced motion; state meaning always remains in adjacent text.
