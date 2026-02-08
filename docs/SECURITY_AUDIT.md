# Security Audit Report

**Date:** 2026-02-08
**Auditor:** Claude Code
**Scope:** Smart Contracts, Backend API, Mobile App

---

## Executive Summary

This audit identified **5 Critical**, **4 High**, **6 Medium**, and **4 Low** severity issues across the codebase. The most critical issues are in the smart contracts' administrative functions and backend authentication.

| Severity | Count | Fixed |
|----------|-------|-------|
| Critical | 5 | 0 |
| High | 4 | 0 |
| Medium | 6 | 0 |
| Low | 4 | 0 |

---

## Critical Findings

### C-01: Dispute Resolver Can Be Changed Anytime
**File:** `contracts/CyxTradeEscrow.sol:320`
**Severity:** CRITICAL

```solidity
function setDisputeResolver(address _disputeResolver) external onlyBackend {
    disputeResolver = _disputeResolver;
}
```

**Issue:** Backend can change the dispute resolver at any time to a malicious contract that could drain slashed bonds.

**Recommendation:** Only allow setting once, or add a timelock:
```solidity
function setDisputeResolver(address _disputeResolver) external onlyBackend {
    require(disputeResolver == address(0), "Already set");
    disputeResolver = _disputeResolver;
}
```

---

### C-02: Arbitrator Registry Can Be Changed Anytime
**File:** `contracts/DisputeResolution.sol:114`
**Severity:** CRITICAL

```solidity
function setArbitratorRegistry(address _registry) external onlyBackend {
    arbitratorRegistry = _registry;
}
```

**Issue:** Same as C-01. Backend can swap to malicious registry.

**Recommendation:** Only allow setting once.

---

### C-03: Missing ReentrancyGuard in DisputeResolution
**File:** `contracts/DisputeResolution.sol`
**Severity:** CRITICAL

**Issue:** The `_resolveDispute` function calls external contract `escrow.resolveDispute()` without reentrancy protection. A malicious escrow implementation could re-enter.

**Recommendation:** Add `ReentrancyGuard` and use `nonReentrant` modifier:
```solidity
contract DisputeResolution is ReentrancyGuard {
    function finalizeDispute(...) external nonReentrant { ... }
}
```

---

### C-04: JWT Secret Fallback to Hardcoded Value
**File:** `backend/src/routes/auth.ts:92` and `backend/src/middleware/auth.ts:22`
**Severity:** CRITICAL

```typescript
const secret = process.env.JWT_SECRET || 'dev-secret';
```

**Issue:** If JWT_SECRET env variable is not set in production, anyone can forge tokens using 'dev-secret'.

**Recommendation:** Fail hard if JWT_SECRET is not set:
```typescript
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET environment variable is required');
```

---

### C-05: Fixed OTP in Development Mode
**File:** `backend/src/routes/auth.ts:29`
**Severity:** CRITICAL

```typescript
const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.random().toString().slice(2, 8);
```

**Issue:** If NODE_ENV is not explicitly set to 'production', OTP is always '123456'. An attacker could login as any phone number.

**Recommendation:** Never use fixed OTP, even in development:
```typescript
const otp = Math.random().toString().slice(2, 8);
// Log only in development
if (process.env.NODE_ENV === 'development') {
  console.log(`OTP for ${phone}: ${otp}`);
}
```

---

## High Findings

### H-01: IDOR in Trade Cancellation
**File:** `backend/src/routes/trades.ts:356-370`
**Severity:** HIGH

```typescript
const trade = await findTradeById(id);
if (trade.user_id !== userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'You can only cancel your own trades');
}
// ...
await declineTrade(id, trade.trader_id);  // Uses trader_id from trade, not verified
```

**Issue:** Authorization check exists but `declineTrade` is called with `trade.trader_id` which comes from the database. If `findTradeById` returns stale data, race conditions could occur.

**Recommendation:** Use database transactions and verify ownership atomically.

---

### H-02: No Rate Limiting on OTP Requests
**File:** `backend/src/routes/auth.ts:15-38`
**Severity:** HIGH

**Issue:** No rate limiting on OTP endpoint. Attackers can:
1. Brute-force OTPs (6 digits = 1M combinations)
2. Drain SMS budget via OTP spam
3. DoS the service

**Recommendation:** Add rate limiting:
```typescript
import rateLimit from 'express-rate-limit';

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute per IP
  message: 'Too many OTP requests'
});

router.post('/otp', otpLimiter, asyncHandler(...));
```

---

### H-03: ArbitratorRegistry Contract Links Can Be Changed
**File:** `contracts/ArbitratorRegistry.sol:117-133`
**Severity:** HIGH

**Issue:** `setDisputeContract` and `setEscrowContract` can be changed multiple times if called by the current contract. This creates risk if either contract is compromised.

**Recommendation:** Only allow setting once:
```solidity
function setDisputeContract(address _disputeContract) external {
    require(disputeContract == address(0), "Already set");
    // ...
}
```

---

### H-04: Pseudo-Random Arbitrator Selection
**File:** `contracts/ArbitratorRegistry.sol:313-353`
**Severity:** HIGH

```solidity
uint256 seed = uint256(keccak256(abi.encodePacked(
    tradeId,
    blockhash(block.number - 1),
    block.timestamp
)));
```

**Issue:** Miners can manipulate `blockhash` and `block.timestamp` to influence arbitrator selection. In high-value disputes, this could be exploited.

**Recommendation:** Use Chainlink VRF for production:
```solidity
// Request randomness from Chainlink VRF
requestId = COORDINATOR.requestRandomWords(...);
```

---

## Medium Findings

### M-01: Dispute Tie Goes to Trader
**File:** `contracts/DisputeResolution.sol:418-425`
**Severity:** MEDIUM

```solidity
if (userVotes > traderVotes) {
    outcome = Vote.FAVOR_USER;
} else {
    // Tie or trader wins -> trader keeps bond
    outcome = Vote.FAVOR_TRADER;
}
```

**Issue:** In a tie (2-2 with 1 abstain), trader wins by default. This could be seen as unfair to users.

**Recommendation:** Consider requiring a clear majority (3+ votes) or escalating ties to a larger panel.

---

### M-02: No Trade Timeout Enforcement
**File:** `contracts/CyxTradeEscrow.sol:50`
**Severity:** MEDIUM

**Issue:** `timeout` field exists in Trade struct but is never enforced. Backend could keep trades open indefinitely.

**Recommendation:** Add `checkTimeout` function:
```solidity
function checkTimeout(bytes32 tradeId) external {
    Trade storage trade = trades[tradeId];
    if (block.timestamp > trade.timeout && trade.state < TradeState.COMPLETED) {
        // Auto-dispute or auto-cancel
    }
}
```

---

### M-03: OTP Stored In-Memory
**File:** `backend/src/routes/auth.ts:12`
**Severity:** MEDIUM

```typescript
const otpStore = new Map<string, { otp: string; expires: number }>();
```

**Issue:** OTPs stored in-memory are lost on server restart. With multiple server instances, OTPs won't work across instances.

**Recommendation:** Use Redis:
```typescript
await redis.setex(`otp:${phone}`, 300, otp);
```

---

### M-04: No Token Blacklist for Logout
**File:** `backend/src/routes/auth.ts:127-130`
**Severity:** MEDIUM

```typescript
router.delete('/logout', asyncHandler(async (req, res) => {
    // TODO: Invalidate token in Redis
    sendSuccess(res, { message: 'Logged out' });
}));
```

**Issue:** Logout doesn't actually invalidate the JWT. Token remains valid until expiry.

**Recommendation:** Implement token blacklist in Redis:
```typescript
await redis.setex(`blacklist:${token}`, tokenTTL, '1');
// Check in authMiddleware
if (await redis.get(`blacklist:${token}`)) {
    return res.status(401).json({ error: 'Token revoked' });
}
```

---

### M-05: Trade Details Exposed Without Ownership Check
**File:** `backend/src/routes/trades.ts:172-224`
**Severity:** MEDIUM

**Issue:** `GET /api/trades/:id` returns full trade details without verifying if the requester is the user or trader involved.

**Recommendation:** Add ownership check:
```typescript
if (trade.user_id !== userId && trade.trader_id !== traderId) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
}
```

---

### M-06: Sensitive Error Details in Response
**File:** `backend/src/middleware/errorHandler.ts`
**Severity:** MEDIUM

**Issue:** Stack traces and internal error details may be leaked in production.

**Recommendation:** Sanitize errors in production:
```typescript
if (process.env.NODE_ENV === 'production') {
    delete error.stack;
}
```

---

## Low Findings

### L-01: Mock Data Fallbacks in Production Code
**File:** `backend/src/routes/trades.ts:92-111`
**Severity:** LOW

**Issue:** Mock trade creation fallback could be triggered in production if database is unavailable.

**Recommendation:** Fail explicitly if database is unavailable in production.

---

### L-02: No Input Sanitization for IPFS Hashes
**File:** `contracts/DisputeResolution.sol:167`
**Severity:** LOW

**Issue:** Evidence IPFS hashes are stored without validation.

**Recommendation:** Validate IPFS hash format (Qm... or bafy...).

---

### L-03: Gas Griefing in Arbitrator Selection Loop
**File:** `contracts/ArbitratorRegistry.sol:330-350`
**Severity:** LOW

**Issue:** With many arbitrators and unlucky random draws, the while loop could consume excessive gas.

**Recommendation:** Add a maximum iteration limit.

---

### L-04: No Contract Pausability
**File:** All contracts
**Severity:** LOW

**Issue:** No way to pause contracts in case of critical bug discovery.

**Recommendation:** Consider adding `Pausable` from OpenZeppelin (but be aware this adds admin risk).

---

## Recommendations Summary

### Immediate Actions (Before Mainnet)

1. **Fix C-01 to C-05** - All critical issues must be resolved
2. **Add rate limiting** to all public endpoints
3. **Use Redis** for OTP and session storage
4. **Remove mock data fallbacks** in production

### Before Public Launch

1. **Implement Chainlink VRF** for arbitrator selection
2. **Add trade timeout enforcement**
3. **Implement token blacklist**
4. **Add ownership checks** on all trade endpoints

### Ongoing

1. Regular security audits
2. Bug bounty program
3. Monitoring and alerting

---

## Files Reviewed

| File | Lines | Issues |
|------|-------|--------|
| `CyxTradeEscrow.sol` | 405 | 3 |
| `ArbitratorRegistry.sol` | 486 | 3 |
| `DisputeResolution.sol` | 435 | 3 |
| `auth.ts` | 133 | 4 |
| `trades.ts` | 447 | 3 |
| `auth.ts (middleware)` | 51 | 1 |

---

*This audit is provided as-is. A professional third-party audit is recommended before mainnet deployment.*
