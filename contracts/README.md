# CyxTrade Smart Contracts

Non-custodial escrow contracts for P2P fiat exchange on Tron.

## Contracts

| Contract | Description |
|----------|-------------|
| `CyxTradeEscrow.sol` | Main escrow - holds trader bonds, locks per trade |
| `ArbitratorRegistry.sol` | Arbitrator staking and selection |
| `DisputeResolution.sol` | Dispute handling with commit-reveal voting |

## Security Model

**Users don't need crypto.** Backend creates trades on their behalf.

**Traders stake bonds.** If they scam, bond is slashed.

**No admin keys.** Contract is immutable.

| Actor | Can Lock Bonds | Can Withdraw Bonds |
|-------|----------------|-------------------|
| Trader | - | YES (own only) |
| Backend | YES | NO |
| Contract Owner | - | NO |

## Setup

```bash
npm install

# Set environment variables
export TRON_PRIVATE_KEY=your_private_key
export BACKEND_ADDRESS=your_backend_address
```

## Deploy

```bash
# Testnet (Shasta)
npm run migrate:shasta

# Mainnet (use with caution)
npm run migrate:mainnet
```

## Test

```bash
npm test
```

## Trade Flow

```
1. Trader deposits bond      → depositBond(1000)
2. User creates trade        → createTrade(...) [backend calls]
3. Trade progresses          → updateTradeState(...) [backend calls]
4. Trade completes           → completeTrade(...) → bond unlocked
5. If dispute                → openDispute(...) → arbitrators vote
```

## Contract Addresses

### Shasta Testnet
- CyxTradeEscrow: `TBD`
- ArbitratorRegistry: `TBD`
- DisputeResolution: `TBD`

### Mainnet
- CyxTradeEscrow: `TBD`
- ArbitratorRegistry: `TBD`
- DisputeResolution: `TBD`

## License

MIT
