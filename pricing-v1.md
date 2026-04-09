# CyxTrade Pricing V1

Effective date: March 2026  
Status: Launch pricing (liquidity-first)

## 1) Trade Fees (Core Revenue)

Platform fee is charged on **completed trades** and taken from the **trader/advertiser side**.
Buyer fee is set to `0%` in V1.

| Corridor | Trader Fee | Buyer Fee | Fee Floor |
|---|---:|---:|---:|
| AED -> XAF | 0.45% | 0.00% | $1 equivalent |
| USD -> XAF | 0.55% | 0.00% | $1 equivalent |
| EUR -> XAF | 0.55% | 0.00% | $1 equivalent |
| GBP -> XAF | 0.65% | 0.00% | $1 equivalent |

Notes:
- Higher-risk corridors can receive a temporary surcharge of `+0.10%` to `+0.20%`.
- Fee is separate from the trader's FX spread.

## 2) Trader Subscription Plans

### Free (Default)
- Price: `$0/month`
- Standard listing visibility
- Basic dashboard metrics
- Normal support queue

### Pro
- Price: `$39/month`
- Priority listing boost
- Advanced analytics
- Faster support SLA
- Fee rebate: `-0.05%` from base corridor fee

### Elite
- Price: `$99/month`
- Maximum listing priority
- Advanced analytics + exports/API access
- Priority dispute handling queue
- Fee rebate: `-0.12%` from base corridor fee

Fee floor rule:
- Final fee cannot go below `0.25%` after rebates/discounts.

## 3) Monthly Volume Discounts (Stack With Plan, Respect Floor)

| Trader Monthly Completed GMV | Additional Fee Discount |
|---|---:|
| < $25,000 | 0.00% |
| $25,000 - $99,999 | -0.05% |
| $100,000 - $299,999 | -0.10% |
| >= $300,000 | -0.15% |

## 4) Add-On Fees

- Dispute filing fee: `$10` (refunded if filer wins).
- Instant settlement fee: `0.20%` (min `$1`, max `$15`).
- Priority payout processing: `$2` per payout.
- API/white-label partner package: custom (base monthly + usage).

## 5) Example Monthly Revenue

Assume corridor GMV:
- AED -> XAF: `$900,000`
- USD -> XAF: `$600,000`
- EUR -> XAF: `$350,000`
- GBP -> XAF: `$150,000`
- Total GMV: `$2,000,000`

Core fee revenue:
- AED -> XAF: `$900,000 x 0.45% = $4,050`
- USD -> XAF: `$600,000 x 0.55% = $3,300`
- EUR -> XAF: `$350,000 x 0.55% = $1,925`
- GBP -> XAF: `$150,000 x 0.65% = $975`
- Core fee subtotal: `$10,250`

Subscription revenue (example):
- 60 Pro traders: `60 x $39 = $2,340`
- 15 Elite traders: `15 x $99 = $1,485`
- Subscription subtotal: `$3,825`

Add-on revenue (example):
- Disputes + instant settlement + priority payouts: `$1,500`

Projected monthly gross revenue:
- `$10,250 + $3,825 + $1,500 = $15,575`

## 6) Implementation Rules

- Charge platform fee only when trade status becomes `completed`.
- Keep buyer fee at `0%` until liquidity/retention targets are met.
- Recalculate fee tier monthly based on prior 30-day completed GMV.
- Publish fee schedule in-app (Settings / Fee Policy).
- Review corridor fees monthly and adjust by:
  - liquidity depth
  - fraud/dispute rate
  - support cost per trade

