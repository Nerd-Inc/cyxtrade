# CyxTrade Mainnet Deployment Guide

This guide covers deploying CyxTrade smart contracts to Tron mainnet.

## Prerequisites

1. **Shasta testnet deployment working** - Ensure all contracts work on Shasta first
2. **E2E test passing** - Run `npx ts-node scripts/test-e2e-trade.ts` successfully
3. **TRX for gas** - Need ~500-1000 TRX for deployments
4. **USDT for testing** - Small amount for initial test trades

---

## Step 1: Create Mainnet Wallet

Generate a new wallet for the backend signer:

```bash
# Install TronLink browser extension or use TronWeb CLI
npm install -g tronweb-cli

# Generate new wallet
tronweb-cli generate-address
# Output:
# Address: TXxxxxxxxxxxxxxxxxxxxxxxxxx
# Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# SAVE THESE SECURELY!
```

### Wallet addresses

Tron addresses are generated once and retain the same format (`T…`) whether you later connect to mainnet or a testnet (Shasta/Nile). The choice of network happens when the backend sets `TRON_NETWORK` and calls a specific node; there’s no need to regenerate the address every time you switch networks.

**Important:** This wallet will sign transactions on behalf of users. It CANNOT withdraw trader bonds (only smart contract logic controls bonds).

---

## Step 2: Fund the Wallet

1. Transfer ~500-1000 TRX to the new wallet address
2. This covers gas for deployments and initial operations
3. Monitor balance and top up as needed

---

## Step 3: Deploy Contracts

### 3.1 Deploy CyxTradeEscrow

```bash
cd contracts

# Update tronbox.js with mainnet private key
# network: mainnet
# privateKey: <your-new-wallet-private-key>

# Deploy
tronbox migrate --network mainnet --f 1 --to 1
```

Save the deployed address.

### 3.2 Deploy ArbitratorRegistry

```bash
tronbox migrate --network mainnet --f 2 --to 2
```

Save the deployed address.

### 3.3 Deploy DisputeResolution

```bash
tronbox migrate --network mainnet --f 3 --to 3
```

Save the deployed address.

### 3.4 Link Contracts

After deployment, link the contracts together:

```bash
# Connect dispute resolution to escrow
tronbox console --network mainnet

> const escrow = await CyxTradeEscrow.deployed()
> await escrow.setDisputeContract('DISPUTE_CONTRACT_ADDRESS')

> const dispute = await DisputeResolution.deployed()
> await dispute.setEscrowContract('ESCROW_CONTRACT_ADDRESS')
> await dispute.setRegistryContract('REGISTRY_CONTRACT_ADDRESS')
```

---

## Step 4: Update Backend Configuration

Update `.env` with mainnet values:

```env
# Blockchain (Tron) - MAINNET
TRON_NETWORK=mainnet
TRON_PRIVATE_KEY=your-mainnet-signer-private-key
ESCROW_CONTRACT=Txxxxxxxxxxxxxxxxxxxxxxxxx
REGISTRY_CONTRACT=Txxxxxxxxxxxxxxxxxxxxxxxxx
DISPUTE_CONTRACT=Txxxxxxxxxxxxxxxxxxxxxxxxx
USDT_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t  # Real USDT-TRC20
```

---

## Step 5: Security Checklist

Before going live, verify:

- [ ] Private key is NOT committed to git
- [ ] Private key is stored in secure secret manager
- [ ] Backend runs with minimal permissions
- [ ] Rate limiting is configured
- [ ] Database has proper backups
- [ ] Monitoring/alerting is set up
- [ ] SSL/TLS is configured for API

---

## Step 6: Initial Test Trade

Perform a small test trade on mainnet:

1. Register a test trader with minimum bond ($100)
2. Create a trade for $10 equivalent
3. Complete the full trade lifecycle
4. Verify blockchain transactions on tronscan.org

---

## Contract Addresses

### Shasta Testnet (Current)

| Contract | Address |
|----------|---------|
| CyxTradeEscrow | `TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm` |
| ArbitratorRegistry | `TG5FQEiDTSJKYKCf44GnkpckvazBNabbxo` |
| DisputeResolution | `TKvov2ThwCmxQ2RrFbZi5nMYJNKrLYoPAM` |
| MockUSDT | `TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn` |

### Mainnet (After Deployment)

| Contract | Address |
|----------|---------|
| CyxTradeEscrow | `T...` |
| ArbitratorRegistry | `T...` |
| DisputeResolution | `T...` |
| USDT-TRC20 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |

---

## Monitoring

Set up monitoring for:

1. **Backend health** - API response times, error rates
2. **Blockchain sync** - Ensure trade states match on-chain
3. **Bond balances** - Alert on low trader bonds
4. **Dispute queue** - Alert on open disputes > 24h

---

## Rollback Plan

If issues occur after mainnet deployment:

1. **Pause trading** - Set trader status to offline
2. **Disable blockchain calls** - Remove `TRON_PRIVATE_KEY` from env
3. **Investigate** - Check logs, transaction history
4. **Fix and redeploy** - If contract bug, deploy new version
5. **Migrate state** - Use admin tools to migrate pending trades

---

## Support

For deployment assistance:
- Check contract ABI in `contracts/build/`
- View transaction history on [TronScan](https://tronscan.org)
- Contact team on Discord/Telegram
