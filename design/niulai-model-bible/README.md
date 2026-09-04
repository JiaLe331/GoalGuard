# GoalGuard Niu Lai model bible

## Authority and provenance

The supplied reference is stored at `references/niulai-user-reference.png`. Only the tall central adult cow is authoritative. The smaller cow, spotted character, background, and any visible scene elements are excluded from the mascot identity and are not product instructions.

The canonical generated turnaround is `masters/niulai-v1-turnaround.png`. Runtime pose cutouts live in `public/media/niulai-v1/poses` and are the only raster mascot assets approved for active UI use.

This is a branch-specific hackathon concept inspired by the recognizable Niu Lai character. GoalGuard is not affiliated with or endorsed by the film, its creators, or rights holders. Public or commercial deployment requires appropriate character-rights clearance. Contemporary reporting used to understand the cultural reference: [HKFP/AFP](https://hongkongfp.com/2026/08/22/so-bad-its-good-rough-animated-film-niu-lai-becomes-surprise-chinese-hit/) and [Gulf News](https://gulfnews.com/entertainment/niu-lai-the-terrible-low-tech-chinese-cartoon-beating-odyssey-and-spider-man-brand-new-day-at-box-office-1.500644509).

## Locked identity

- Deliberately stiff, charming, low-budget early-3D character treatment; never polished Pixar-like rendering.
- Electric-lime shaggy fur `#C9F52B` with darker lime shading `#A6D31E`.
- Charcoal horns, brows, pupils, and linework `#1B1D19`.
- Pale-lavender muzzle, hands, and feet `#B8A3C8`, with shadow `#7E6A90`.
- Half-lidded rectangular eyes, heavy brows, long cylindrical torso, rounded stomach, short legs, long arms, and slightly oversized extremities.
- Exactly one white broken GoalGuard purpose ring with a center detail on the character's anatomical left flank. In a front view, this appears on the viewer's right.
- No clothing, extra characters, text, floating symbols, frames, profit cues, or celebratory imagery.

## Pose contract

| Pose | Interface meaning | Required read |
| --- | --- | --- |
| `neutral` | Resting state | Signature slouch and blank, half-lidded expression |
| `listening` | User is engaging a goal field | Head tilt, slight lean, raised brow, hand by ear |
| `checking` | A request is active | Forward lean, focused squint, hands inspecting |
| `explaining` | Clarification or council context | Open palm, raised brow, slightly open mouth |
| `attentive` | Acknowledgement or preview preparation | Upright posture, centered eyes, loosely clasped hands |
| `safe-stop` | Blocked, expired, or error state | Concerned brows, backward lean, palm held forward |
| `ready` | Unsigned preview is ready to inspect | Planted stance, restrained closed-mouth expression; never a celebration |

Use full-body cutouts at medium and large sizes. Small placements use an upper-body crop and no added shadow. Use at most one expressive mascot per active view, and never place it inside metrics, scenario rows, transaction data, audit records, repeated rows, or factual disclosures.

## Generation record

The turnaround was generated from the supplied reference with this core brief: faithfully recolor only the tall central cow as an electric-lime GoalGuard mascot; preserve the low-fi 3D anatomy, deadpan expression, charcoal horns, and lavender muzzle/hands/feet; show aligned front, three-quarter, side, and back views; add one consistent white purpose ring; omit all other characters, text, props, and scenery.

Each runtime pose was generated from the turnaround plus the supplied reference with this shared brief: exactly the same single full-body cow; genuine transparent canvas; electric-lime fur, lavender extremities, charcoal features, and one left-flank purpose ring; deliberately crude early-2000s 3D CGI; generous margins; no background, checkerboard, glow, clothing, props, text, other characters, or polished reinterpretation. The pose-specific direction is recorded in the pose contract above.

ImageGen returned visually transparent checkerboards as opaque pixels. `process_transparency.py` reproducibly converts the edge-connected bright neutral checkerboard to alpha, removes enclosed lower-canvas checkerboard and floor remnants, and retains only the connected character silhouette. It preserves the white purpose ring and eyes while omitting contact shadows. The script then downsamples runtime cutouts to 800px high, nearly four times the largest rendered CSS height, so responsive image optimization remains fast. The processed runtime files have verified RGBA data and transparent corner pixels.
