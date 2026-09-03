# GoalGuard — Project Brief and Research Prompt

## What this project is

GoalGuard is a goal-first ETH downside-protection assistant built for MUBA Hacks 2026. It is designed for everyday crypto holders who think in real-life needs—such as rent, tuition, travel, or an emergency fund—rather than option strikes, expiries, premiums, and Greeks.

A user describes a goal in natural language, for example: “I have $1,200 in ETH for rent next month and cannot afford to lose more than 5%.” GoalGuard turns that request into structured constraints, searches live Thetanuts options on Base for a suitable long-put protection plan, and calculates costs and payoff scenarios with deterministic code.

Before a plan can proceed, three independent AI roles hosted through Gonka review the same facts:

- **Strategist:** checks whether the option fits the goal.
- **Risk Auditor:** searches for risks, unsupported assumptions, and constraint failures.
- **Consumer Advocate:** checks clarity, fairness, and whether the plan truly serves a non-expert user.

Any rejection, uncertainty, malformed response, or failed hard constraint blocks the flow. The user can inspect each verdict, model, reasoning summary, concern, and request ID. The current hackathon version can build a real unsigned Thetanuts transaction preview, but it never asks for a signature, broadcasts a transaction, or claims that funds are protected.

The central idea is: **protect the purpose of the money, not merely the crypto asset.** AI interprets and explains; deterministic code owns financial calculations; live protocol data is the source of truth; and the human remains in control.

## Current distinguishing ideas

- Begins with a life goal instead of a trading instrument.
- Translates plain language into explicit, editable protection constraints.
- Uses real Thetanuts market data and transaction-building infrastructure.
- Separates AI judgment from deterministic financial calculations.
- Uses an independent, adversarial multi-model council rather than one AI recommendation.
- Treats disagreement and uncertainty as reasons to stop.
- Makes AI provenance and review evidence visible to the user.
- Demonstrates an authentic transaction path while remaining safely preview-only.
- Presents downside outcomes in plain language rather than as a professional derivatives terminal.

## Prompt for another AI

Copy the prompt below and attach or paste this document:

> Research whether open-source projects already exist that are identical or meaningfully similar to **GoalGuard**, as described above. Search GitHub, open-source DeFi applications, hackathon projects, research prototypes, and relevant agentic-finance tools. Focus especially on projects combining natural-language financial goals, crypto downside protection or options, AI-assisted hedging, multi-agent review, deterministic safety checks, and human-approved transaction previews.
>
> Please deliver:
>
> 1. A table of the closest existing projects with project name, direct repository/site link, license, last meaningful activity, what it does, technical approach, and how closely it overlaps with GoalGuard.
> 2. A clear verdict on whether GoalGuard appears genuinely differentiated. Separate direct competitors from projects that share only one component.
> 3. The most creative or technically distinctive ideas found in those projects, explaining why each is useful. Do not merely list generic features.
> 4. The strongest creative additions GoalGuard could make, grouped into:
>    - high-impact features feasible during a hackathon;
>    - post-hackathon product ideas;
>    - safety, trust, explainability, or financial-literacy innovations.
> 5. For every proposed addition, state user value, novelty, implementation difficulty, dependencies, key risks, and whether it strengthens or distracts from GoalGuard’s goal-first positioning.
> 6. A ranked top-five recommendation list and one suggested “signature demo moment” that judges would remember.
>
> Use current web research and provide direct citations for every identified project. Verify that repositories actually exist and inspect their README/code where possible. Do not invent projects, features, protocol support, market data, or activity. Note uncertainty explicitly. Distinguish open-source code from closed-source products, abandoned demos, academic concepts, and marketing claims. Also flag license or attribution considerations so we can learn from existing work without copying it.

