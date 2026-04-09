# CyxTrade Amendment Roadmap (From Competitive Research)

> Goal: make CyxTrade clearly superior in underserved corridors while preserving the protocol core.

---

## Non-Negotiable Core (Unchanged)

- Non-custodial smart-contract bond enforcement
- Users do not need wallets or on-chain complexity
- Community arbitration with economic stake
- Corridor-first execution and local payment-rail pragmatism

---

## Product Amendments (Adopt and Adapt)

## Wave 1: Trust and Safety Surface (0-6 weeks)

1. Trader Trust Scorecard
- Add public metrics per trader:
  - 30-day completion rate
  - Median release time
  - Dispute rate
  - Active bond coverage ratio
- Why: Borrows Binance's visible trust signals, but anchored to CyxTrade bond mechanics.

2. Fee and Payout Transparency Screen
- Before confirmation, show:
  - Input amount
  - Spread and service fee
  - Expected recipient amount
  - Time estimate confidence band
- Why: Matches Venmo/PayPal clarity and reduces drop-off.

3. Scam Risk Interrupts
- Trigger warnings for:
  - "Pay outside app" instructions
  - Reused suspicious account details
  - Edited screenshot evidence patterns
  - Urgent coercive language signatures
- Why: Cash App style warnings with remittance-specific controls.

4. Structured Dispute Intake
- Claim classes:
  - Payment sent, not released
  - Incorrect payout amount
  - Wrong recipient/channel
  - Fake proof / altered evidence
- Required evidence checklist per class.
- Why: PayPal-grade dispute structure with CyxTrade arbitration.

---

## Wave 2: Trader Operations Excellence (6-12 weeks)

1. Trader Operations Console
- Role-based access (owner, operator, auditor)
- Bulk trade actions and payout queues
- Multi-corridor books and liquidity tracking
- Why: Mercury/Stellas/9jaPay business tooling pattern.

2. Corridor Sub-Accounts
- Separate balances and limits by corridor (for example AED-XAF, USD-NGN)
- Why: Limits blast radius and improves compliance mapping.

3. Reliability Tiers and Badges
- Badge rules tied to measurable SLOs
- Automatic downgrade on sustained breaches
- Why: Incentive loop from Binance merchant systems.

4. Recurring Remittance Templates
- Saved recipient rails, schedules, and preferred trader sets
- Why: 9jaPay convenience without super-app bloat.

---

## Wave 3: Network Effects With Guardrails (12-20 weeks)

1. Trusted Payment Request Links
- Link creates prefilled remittance intent within allowed corridor policy
- No off-platform settlement instructions
- Why: Social payment convenience while preserving anti-scam controls.

2. Cash-In/Cash-Out Partner Mode
- Controlled partner network for unbanked endpoints
- One-time beneficiary claim code and receipt verification
- Why: PaysafeCard accessibility pattern adapted to P2P remittance.

3. Trader Pro Monetization
- Free core participation
- Paid pro tier for:
  - API access
  - Advanced analytics
  - Team workflows
  - Priority dispute queue visibility tools
- Why: Mercury-style sustainable business model.

---

## What We Explicitly Reject

- Public-by-default social feed for transaction visibility
- Centralized discretionary custody/freeze as primary mechanism
- Super-app feature sprawl unrelated to remittance quality
- Growth tactics that weaken AML/CFT, sanctions, or fraud controls

---

## KPI Targets

Trust and safety:
- Dispute rate < 2.0%
- Proven scam-loss ratio < 0.15% of volume
- Median evidence-to-resolution < 72 hours

User outcomes:
- Median end-to-end completion < 35 minutes
- All-in user cost <= 3.0% on MVP corridor median
- Repeat sender rate >= 60% by month 6 cohort

Trader outcomes:
- Active trader retention >= 75% per quarter
- Median trader response time < 3 minutes in active windows
- 90th percentile payout SLA adherence >= 95%

Business outcomes:
- Positive contribution margin on pro trader tier by wave 3
- Complaint-to-resolution CSAT >= 4.3/5

---

## Immediate Build Backlog (Next Sprint)

1. `trader_scorecard` API and UI surface
2. `quote_breakdown` object in trade quote response
3. `risk_warning` event system in trade chat and proof flow
4. `dispute_claim_type` schema and evidence checklist templates
5. Basic trader role model (`owner`, `operator`, `auditor`)

---

## Messaging Update

Primary product line:
- "CyxTrade gives underserved corridors institution-grade trust signals without institutional custody."

Compliance line:
- "No hiding place for bad actors: bonded traders, auditable disputes, enforceable penalties."

---

*Last updated: 2026-03-07*
