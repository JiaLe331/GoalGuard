# GoalGuard mascot exploration — round two

> **Selection update:** The team selected Pip the Pangolin after reviewing this round. The alternatives and recommendation below remain the exploration record; current development continues in `pip-colour-harmony.html` and `PIP_MASCOT_SPEC.md`.

The first Pip direction proved that a mascot can make GoalGuard feel more human, but it also exposed an avoidable category resemblance: a lime animal head in side profile with a large round eye and small smile can be read as “another crypto lizard,” even when the character is a pangolin.

This round tests different silhouettes and different reasons for a mascot to exist. The lime point remains the user’s purpose in every direction.

## Direction motives

| Direction | Motive | What the silhouette says | Principal advantage | Principal risk |
| --- | --- | --- | --- | --- |
| **Pip the Pangolin** | Armour that stays open around the user’s purpose. Pip is patient and attentive rather than heroic. | A friendly side-profile guide with layered protection scales. | Warmest conversational companion and already has a useful pose system. | Closest to CoinGecko’s category cues: lime animal head, profile, round eye, smile. |
| **Tavi the Tortoise** | Protection should be deliberate, stable, and paced around a real deadline rather than market urgency. The shell panels surround a visible purpose point. | A solid, front-facing guardian with a strong shell. | Clearest protection metaphor and strongest feeling of dependability. | Tortoises are common insurance/savings mascots; “slow” can become the unintended takeaway. |
| **Miro the Manta** | The broad wings form a calm canopy while the character moves through complex terrain without looking aggressive. | A distinctive top-down diamond form with a long tail. | Most ownable silhouette, least crypto-cliché, and excellent for restrained motion. | The guarding metaphor needs one sentence of introduction; some users may first read it as ocean/travel. |
| **Nook the Weaverbird** | A financial goal is something built and cared for. The open nest shows preparation without promising an impenetrable barrier. | A bird and two open nest arcs around the purpose point. | Strongest human-purpose story and naturally suits goal creation/progress. | More illustrative and detailed; requires a separate micro-mark below roughly 32px. |
| **Lumi the Firefly** | GoalGuard makes the purpose visible while guiding the user through uncertainty. The wings behave like open brackets rather than a shield. | A compact, symmetrical guide with a bright lower beacon. | Best small UI companion and clearest “clarity” cue. | Guidance is stronger than protection; it can feel youthful if the face becomes more expressive. |

## 2D or 3D?

Use a **2D mascot as the master identity**.

GoalGuard is a trust-sensitive financial product, and its visual system is intentionally flat, code-native, high-contrast, and sparse. A 2D character reproduces cleanly at favicon and navbar sizes, works in light/dark/lime themes, stays legible beside exact financial facts, and can be animated with simple SVG transforms without adding a rendering dependency. It is also faster to keep consistent across listening, checking, explaining, safe-stop, confirmation, and demo-ready states.

A polished 3D character would add warmth and presentation impact, but it also adds texture, lighting, camera-angle, render-consistency, file-size, and accessibility problems. In-product 3D can make the experience feel more promotional or game-like precisely where GoalGuard needs restraint. It also conflicts with the current design system’s ban on 3D UI icons and heavy illustration.

If a 3D treatment is desired later, use it as a **campaign derivative** only: pitch-deck cover, launch still, event booth, or social asset. It should be modelled directly from the approved 2D silhouette and should never replace the 2D navbar, favicon, status, or workflow assets.

## Recommendation

1. Shortlist **Miro the Manta** as the strongest master mascot direction. Its top-down silhouette decisively separates GoalGuard from CoinGecko and its canopy shape expresses bounded protection without using a shield or lock.
2. Keep **Nook the Weaverbird** as the purpose-led alternative. It tells the most human story, especially for rent, tuition, travel, and emergency-fund goals.
3. Keep **Lumi the Firefly** as the best lightweight UI helper if the team decides the brand mark should remain abstract and the mascot should be secondary.
4. Do not advance Pip unchanged. If Pip remains emotionally preferred, redesign it front-facing, move lime from the entire head to one accent/core, reduce the cartoon eye-and-smile treatment, and use the armour silhouette rather than the face as the identifying feature.

## Decision criteria for the next round

- Distinct from crypto exchange and token mascots at a one-second glance.
- Recognisable in monochrome and at 24px with a simplified micro-mark.
- Calm and helpful without implying advice, certainty, or execution.
- Able to support the six product states without exaggerated emotion.
- Compatible with GoalGuard’s black, white, neutral, and electric-lime system.
- Strong enough as a silhouette that a future 3D derivative is optional, not required.
