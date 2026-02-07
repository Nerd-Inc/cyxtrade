# CyxTrade MVP User Stories

> Exact flows for the minimum viable product. What users can do, step by step.

---

## MVP Scope Reminder

**What MVP includes:**
- Create/join ONE network
- Post buy/sell orders
- Execute trades with simple escrow (2-of-2)
- Basic trade chat
- Reputation display (read-only, calculated from history)

**What MVP does NOT include:**
- Multi-party escrow (3-of-5)
- Dispute resolution system
- Vouching (everyone can join with invite code)
- Multiple networks
- Mobile app

---

## User Personas

### Mamadou (The Trader)
- Lives in Cameroon
- Has both XAF (local) and USDT (crypto)
- Wants to profit from spread between buying/selling USDT
- Experienced, will be high-volume user

### Ali (The Sender)
- Works in UAE
- Wants to send money to family in Cameroon
- Has AED, needs to convert to XAF
- Occasional user (monthly remittance)

### Marie (The Recipient)
- Lives in Cameroon
- Ali's sister
- Has Orange Money account
- May not even use CyxTrade directly (just receives fiat)

---

## Epic 1: Network Setup

### Story 1.1: Create a Network

**As** Mamadou (network founder)
**I want to** create a new trading network
**So that** I can invite trusted people to trade

**Flow:**
```
1. Mamadou runs cyxtraded (daemon)
2. Mamadou: /network create "Cameroon-UAE Traders"
3. System generates:
   - Network ID (random 16 bytes)
   - Invite code (network_id + founder signature)
4. System displays:
   "Network created: Cameroon-UAE Traders
    Network ID: a1b2c3d4...
    Invite code: CYX-XXXX-XXXX-XXXX-XXXX
    Share this code with people you trust."
5. Mamadou is now founder (rep: 1000)
```

**Acceptance Criteria:**
- [ ] Network created with unique ID
- [ ] Invite code generated
- [ ] Founder has rep 1000
- [ ] Network config stored locally and in DHT

---

### Story 1.2: Join a Network

**As** Ali (new user)
**I want to** join Mamadou's network
**So that** I can trade with trusted people

**Flow:**
```
1. Mamadou shares invite code with Ali (WhatsApp, etc.)
2. Ali runs cyxtraded
3. Ali: /network join CYX-XXXX-XXXX-XXXX-XXXX
4. System:
   - Validates invite code
   - Connects to network
   - Announces Ali's presence
5. System displays:
   "Joined network: Cameroon-UAE Traders
    Your reputation: 1 (new member)
    Trade limit: 100 USDT
    Members online: 3"
6. Ali can now see orders and trade
```

**Acceptance Criteria:**
- [ ] Valid invite code accepted
- [ ] Invalid/expired code rejected with clear error
- [ ] New user starts with rep 1
- [ ] New user has appropriate trade limits
- [ ] User appears in network member list

---

### Story 1.3: View Network Info

**As** a network member
**I want to** see network details
**So that** I know who I'm trading with

**Flow:**
```
1. Ali: /network info
2. System displays:
   "Network: Cameroon-UAE Traders
    ID: a1b2c3d4...
    Members: 5
    Founders: Mamadou
    Your role: Member
    Your reputation: 1
    Your trade limit: 100 USDT"

3. Ali: /network members
4. System displays:
   "Members of Cameroon-UAE Traders:

    FOUNDER:
    - Mamadou (rep: 1000) - online

    TRADERS:
    - Fatou (rep: 250) - online
    - Boubacar (rep: 150) - offline (2h ago)

    MEMBERS:
    - Ali (rep: 1) - online [YOU]
    - Aminata (rep: 45) - online"
```

**Acceptance Criteria:**
- [ ] Network info displayed correctly
- [ ] Member list shows roles and reputation
- [ ] Online/offline status shown
- [ ] Current user highlighted

---

## Epic 2: Order Management

### Story 2.1: Create Sell Order (Trader selling USDT)

**As** Mamadou (trader)
**I want to** post an order to sell USDT for XAF
**So that** buyers can find me

**Flow:**
```
1. Mamadou: /order sell 500 USDT for 330000 XAF
2. System prompts:
   "Payment methods (select all that apply):
    1. Bank Transfer
    2. Mobile Money (Orange/MTN)
    3. Cash in person
    > "
3. Mamadou: 2
4. System prompts:
   "Mobile Money details (encrypted, only shown to counterparty):
    > "
5. Mamadou: "Orange Money: +237 6XX XXX XXX (Mamadou Diallo)"
6. System prompts:
   "Order settings:
    - Minimum amount: [50 USDT]
    - Maximum amount: [500 USDT]
    - Expires in: [24 hours]
    Confirm? (y/n)"
7. Mamadou: y
8. System displays:
   "Order created!
    ID: ord_abc123
    Selling: 500 USDT
    Price: 660 XAF per USDT
    Payment: Mobile Money
    Expires: 24h

    Waiting for buyers..."
```

**Acceptance Criteria:**
- [ ] Order created with all details
- [ ] Payment details encrypted
- [ ] Order appears in network order book
- [ ] Order expires after set time
- [ ] Price per unit calculated correctly

---

### Story 2.2: Create Buy Order (Ali buying USDT)

**As** Ali
**I want to** post an order to buy USDT with AED
**So that** I can get crypto to send to Cameroon

**Flow:**
```
1. Ali: /order buy 100 USDT for 370 AED
2. System prompts for payment methods and details
3. Ali selects Bank Transfer, provides his bank details
4. System creates order
5. System displays:
   "Order created!
    ID: ord_def456
    Buying: 100 USDT
    Price: 3.70 AED per USDT
    Payment: Bank Transfer

    Note: Your limit is 100 USDT (new member).
    Complete trades to increase your limit."
```

**Acceptance Criteria:**
- [ ] Order respects user's trade limit
- [ ] Order rejected if over limit with clear message
- [ ] Buy order visible to sellers

---

### Story 2.3: List Orders

**As** a user
**I want to** see available orders
**So that** I can find good trades

**Flow:**
```
1. Ali: /order list
2. System displays:
   "Orders in Cameroon-UAE Traders:

    === SELL USDT (you buy) ===
    ord_abc123 | Mamadou (rep:1000) | 500 USDT @ 660 XAF | Mobile Money
    ord_ghi789 | Fatou (rep:250)    | 200 USDT @ 665 XAF | Bank/Mobile

    === BUY USDT (you sell) ===
    ord_def456 | Ali (rep:1) [YOU]  | 100 USDT @ 3.70 AED | Bank Transfer
    ord_jkl012 | Boubacar (rep:150) | 300 USDT @ 655 XAF | Mobile Money

    Use /trade <order_id> to start a trade"

3. Ali: /order list XAF
   (filters to only XAF orders)
```

**Acceptance Criteria:**
- [ ] Orders grouped by type (buy/sell)
- [ ] Seller reputation visible
- [ ] Price and payment methods shown
- [ ] Can filter by currency
- [ ] Own orders marked

---

### Story 2.4: Cancel Order

**As** a user with an open order
**I want to** cancel my order
**So that** I can change my terms

**Flow:**
```
1. Ali: /order cancel ord_def456
2. System:
   - Checks no active trades on this order
   - Removes from order book
3. System displays:
   "Order ord_def456 cancelled."
```

**Acceptance Criteria:**
- [ ] Order removed from network
- [ ] Cannot cancel if trade in progress
- [ ] Clear error message if cancellation fails

---

## Epic 3: Trading

### Story 3.1: Initiate Trade (Buyer)

**As** Ali
**I want to** trade with Mamadou's sell order
**So that** I can buy USDT

**Flow:**
```
1. Ali: /trade ord_abc123 100
   (trade 100 USDT from Mamadou's 500 USDT order)

2. System checks:
   - Ali's reputation allows 100 USDT trade ✓
   - Order has enough remaining ✓
   - Ali has no conflicting trades ✓

3. System displays:
   "Trade request sent to Mamadou.

    Trade details:
    - Buying: 100 USDT
    - Paying: 66,000 XAF
    - To: Mamadou (rep: 1000)
    - Payment: Mobile Money

    Waiting for Mamadou to accept...
    Timeout: 15 minutes"

4. Mamadou receives notification:
   "[TRADE REQUEST]
    From: Ali (rep: 1, new member)
    Wants: 100 USDT from your order
    Will pay: 66,000 XAF via Mobile Money

    /trade accept trd_xyz789
    /trade reject trd_xyz789"
```

**Acceptance Criteria:**
- [ ] Trade request created
- [ ] Both parties notified
- [ ] 15-minute timeout for acceptance
- [ ] Trade shows counterparty reputation

---

### Story 3.2: Accept Trade (Seller)

**As** Mamadou
**I want to** accept Ali's trade request
**So that** we can proceed with the trade

**Flow:**
```
1. Mamadou: /trade accept trd_xyz789
2. System:
   - Locks 100 USDT from Mamadou's order
   - Creates escrow (2-of-2 multisig)
   - Updates trade state

3. System displays to Mamadou:
   "Trade accepted!

    100 USDT now in escrow.

    Payment details sent to Ali:
    Orange Money: +237 6XX XXX XXX (Mamadou Diallo)

    Waiting for Ali to send 66,000 XAF...
    Timeout: 2 hours"

4. Ali receives:
   "[TRADE ACCEPTED]
    Mamadou accepted your trade!

    Send 66,000 XAF to:
    Orange Money: +237 6XX XXX XXX (Mamadou Diallo)

    After sending, run:
    /trade fiat-sent trd_xyz789

    Timeout: 2 hours"
```

**Acceptance Criteria:**
- [ ] USDT locked in escrow
- [ ] Payment details revealed to buyer only
- [ ] 2-hour timeout started
- [ ] Order quantity updated (400 USDT remaining)

---

### Story 3.3: Reject Trade (Seller)

**As** Mamadou
**I want to** reject a trade request
**So that** I can decline trades I don't want

**Flow:**
```
1. Mamadou: /trade reject trd_xyz789
2. System displays to Mamadou:
   "Trade rejected."

3. Ali receives:
   "[TRADE REJECTED]
    Mamadou rejected your trade request.
    No reason provided.

    You can try another order with /order list"
```

**Acceptance Criteria:**
- [ ] Trade cancelled cleanly
- [ ] No reputation penalty for rejection
- [ ] Buyer notified

---

### Story 3.4: Mark Fiat Sent (Buyer)

**As** Ali
**I want to** mark that I sent the fiat payment
**So that** Mamadou knows to check

**Flow:**
```
1. Ali sends 66,000 XAF to Mamadou's Orange Money
2. Ali: /trade fiat-sent trd_xyz789
3. System prompts:
   "Transaction reference (optional):
    > "
4. Ali: "OM-TXN-123456789"
5. System displays:
   "Payment marked as sent.
    Reference: OM-TXN-123456789
    Time: 2024-01-15 14:32 UTC

    Waiting for Mamadou to confirm receipt...
    Timeout: 2 hours"

6. Mamadou receives:
   "[PAYMENT SENT]
    Ali marked payment as sent!

    Amount: 66,000 XAF
    Reference: OM-TXN-123456789
    Time: 2024-01-15 14:32 UTC

    Check your Orange Money and confirm:
    /trade confirm trd_xyz789

    If not received, you can dispute:
    /trade dispute trd_xyz789"
```

**Acceptance Criteria:**
- [ ] Trade state updated
- [ ] Seller notified immediately
- [ ] Transaction reference stored
- [ ] Timestamp recorded

---

### Story 3.5: Confirm Payment & Complete Trade (Seller)

**As** Mamadou
**I want to** confirm I received the fiat
**So that** the escrow releases to Ali

**Flow:**
```
1. Mamadou checks Orange Money, sees 66,000 XAF received
2. Mamadou: /trade confirm trd_xyz789
3. System:
   - Requests Mamadou's signature on escrow release
   - Combines with system signature (2-of-2)
   - Releases 100 USDT to Ali
   - Updates reputation for both

4. System displays to Mamadou:
   "Trade completed!

    Released: 100 USDT to Ali
    Received: 66,000 XAF

    Your reputation: 1000 → 1001 (+1)
    Order remaining: 400 USDT"

5. Ali receives:
   "[TRADE COMPLETE]
    Mamadou confirmed your payment!

    You received: 100 USDT
    You paid: 66,000 XAF

    Your reputation: 1 → 2 (+1)
    Your new trade limit: 100 USDT

    Thank you for using CyxTrade!"
```

**Acceptance Criteria:**
- [ ] Escrow released correctly
- [ ] Both parties get reputation boost
- [ ] Trade recorded in history
- [ ] Order updated with remaining amount

---

### Story 3.6: Trade Timeout

**As** the system
**I want to** handle trade timeouts
**So that** funds aren't locked forever

**Flow:**
```
Scenario A: Seller doesn't accept (15 min timeout)
1. Trade expires
2. Ali receives: "Trade trd_xyz789 expired. Mamadou did not respond."
3. Trade marked as EXPIRED, no penalties

Scenario B: Seller doesn't deposit escrow (30 min timeout)
1. Trade expires
2. Ali receives: "Trade trd_xyz789 expired. Seller did not deposit escrow."
3. Mamadou: -0.5 reputation
4. Trade marked as EXPIRED

Scenario C: Buyer doesn't send fiat (2 hour timeout)
1. Trade expires
2. Mamadou receives: "Trade trd_xyz789 expired. Buyer did not send payment."
3. Escrow refunded to Mamadou
4. Ali: -1 reputation
5. Trade marked as EXPIRED

Scenario D: Seller doesn't confirm (2 hour timeout after fiat sent)
1. System auto-raises dispute
2. Both parties notified:
   "[AUTO-DISPUTE]
    Trade trd_xyz789 timed out.
    Seller did not confirm payment.

    MVP NOTE: In MVP, founders will manually review.
    Contact a founder to resolve."
```

**Acceptance Criteria:**
- [ ] Each phase has appropriate timeout
- [ ] Funds returned safely on timeout
- [ ] Appropriate reputation penalties
- [ ] Users notified of expiration

---

## Epic 4: Trade Chat

### Story 4.1: Chat During Trade

**As** a trader
**I want to** chat with my counterparty
**So that** we can coordinate payment details

**Flow:**
```
1. During active trade, Ali: /chat trd_xyz789 "Payment sent, check Orange Money"
2. Mamadou receives:
   "[Ali]: Payment sent, check Orange Money"

3. Mamadou: /chat trd_xyz789 "Got it, checking now"
4. Ali receives:
   "[Mamadou]: Got it, checking now"

5. Either party: /chat trd_xyz789
   (shows chat history)

   "Chat for trade trd_xyz789:
    [14:32] Ali: Payment sent, check Orange Money
    [14:33] Mamadou: Got it, checking now
    [14:35] Mamadou: Received! Confirming now."
```

**Acceptance Criteria:**
- [ ] Messages delivered in real-time
- [ ] Chat only available during active trade
- [ ] Chat history persisted locally
- [ ] Messages encrypted end-to-end

---

## Epic 5: Reputation & History

### Story 5.1: View Reputation

**As** a user
**I want to** see my reputation details
**So that** I understand my trading limits

**Flow:**
```
1. Ali: /rep
2. System displays:
   "Your Reputation: Ali

    Score: 15
    Role: Member

    Trades: 12 completed
      - As buyer: 8
      - As seller: 4
    Volume: 850 USDT total

    Trade limit: 500 USDT (next tier at rep 50)

    Member since: 2024-01-01 (45 days)
    Last trade: 2024-02-10"

3. Ali: /rep Mamadou
4. System displays:
   "Reputation: Mamadou

    Score: 1050
    Role: Founder

    Trades: 523 completed
    Volume: 125,000 USDT total

    Member since: 2023-06-15 (245 days)
    Last trade: 2024-02-14"
```

**Acceptance Criteria:**
- [ ] Own reputation shown with details
- [ ] Can query other users' reputation
- [ ] Trade stats accurate
- [ ] Trade limits shown

---

### Story 5.2: View Trade History

**As** a user
**I want to** see my past trades
**So that** I can track my activity

**Flow:**
```
1. Ali: /history
2. System displays:
   "Your Trade History:

    trd_xyz789 | 2024-02-14 | BUY 100 USDT | 66,000 XAF | Mamadou | COMPLETED
    trd_abc456 | 2024-02-01 | BUY 50 USDT  | 33,500 XAF | Fatou   | COMPLETED
    trd_def123 | 2024-01-20 | SELL 75 USDT | 280 AED    | Yusuf   | COMPLETED
    ...

    Total: 12 trades | 850 USDT volume"

3. Ali: /history trd_xyz789
4. System displays full trade details
```

**Acceptance Criteria:**
- [ ] Trade history stored locally
- [ ] Can view summary list
- [ ] Can view individual trade details
- [ ] History includes all outcomes (completed, expired, etc.)

---

## Epic 6: Basic Wallet

### Story 6.1: View Balance

**As** a user
**I want to** see my crypto balance
**So that** I know what I can trade

**Flow:**
```
1. Ali: /wallet
2. System displays:
   "Your Wallet:

    USDT: 250.00
      - Available: 150.00
      - In escrow: 100.00 (1 active trade)

    USDC: 0.00

    To deposit: /wallet deposit USDT
    To withdraw: /wallet withdraw <amount> <address>"
```

**Acceptance Criteria:**
- [ ] Balance shown correctly
- [ ] Available vs escrowed amounts separated
- [ ] Multiple currencies supported

---

### Story 6.2: Deposit

**As** a user
**I want to** deposit crypto
**So that** I can sell it

**Flow:**
```
1. Mamadou: /wallet deposit USDT
2. System displays:
   "Deposit USDT:

    Send USDT (TRC20) to:
    TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

    Or scan QR: [QR CODE]

    Minimum: 10 USDT
    Confirmations required: 12

    Your balance will update automatically."
```

**Note for MVP:** Actual on-chain wallet management is complex. MVP may use a simplified approach:
- Users bring their own USDT
- Escrow is tracked off-chain within the network
- Actual crypto movement is settled separately

**Acceptance Criteria:**
- [ ] Deposit address generated/shown
- [ ] Deposits detected and credited
- [ ] Minimum amounts enforced

---

## MVP User Journey Summary

### Ali's Journey (First-Time Sender)

```
Day 1:
1. Gets invite code from friend
2. Joins network: /network join CYX-XXXX
3. Sees he has 100 USDT limit (new user)
4. Browses orders: /order list
5. Sees Mamadou selling USDT at good rate

Day 1 (continued):
6. Initiates trade: /trade ord_abc123 100
7. Mamadou accepts
8. Ali sees payment details (Orange Money)
9. Ali sends 66,000 XAF via Orange Money
10. Ali marks sent: /trade fiat-sent trd_xyz789
11. Mamadou confirms
12. Ali receives 100 USDT
13. Reputation: 1 → 2

Day 1 (final):
14. Ali now has USDT, wants to get XAF to Marie
15. Posts order: /order sell 100 USDT for 65000 XAF
    (includes Marie's Orange Money as payment destination)
16. Trader B accepts, sends XAF directly to Marie
17. Ali confirms Marie received
18. Trade complete, Marie has money
19. Total cost: market spread (maybe 2-3%)
```

### Mamadou's Journey (Active Trader)

```
Daily:
1. Check open orders: /order list
2. Post new orders based on market rates
3. Accept incoming trades
4. Receive fiat, confirm, release crypto
5. Profit from spread

Weekly:
1. Review history: /history
2. Adjust prices based on volume
3. Maintain reputation through good service
```

---

## MVP Technical Checklist

### Must Have (MVP)

- [ ] Network creation (single founder)
- [ ] Network joining (invite code)
- [ ] Member listing
- [ ] Order creation (buy/sell)
- [ ] Order listing with filters
- [ ] Order cancellation
- [ ] Trade initiation
- [ ] Trade acceptance/rejection
- [ ] Simple escrow (2-of-2)
- [ ] Fiat sent notification
- [ ] Trade confirmation
- [ ] Trade completion with escrow release
- [ ] Basic timeouts
- [ ] Trade chat
- [ ] Reputation display (read-only)
- [ ] Trade history

### Nice to Have (Post-MVP)

- [ ] Vouching system
- [ ] Reputation calculation with all factors
- [ ] Dispute resolution
- [ ] Multi-party escrow
- [ ] Multiple networks
- [ ] Cross-network trading
- [ ] Mobile notifications
- [ ] On-chain wallet integration

---

## Testing Scenarios

### Happy Path Test

```
1. Create network (Founder F)
2. Join network (Users A, B)
3. F posts sell order: 100 USDT for 66000 XAF
4. A initiates trade for 50 USDT
5. F accepts
6. A marks fiat sent
7. F confirms
8. Verify: A has 50 USDT, F has 50 USDT remaining in order
9. Verify: Both gained reputation
```

### Timeout Test

```
1. A initiates trade with F
2. F does not accept
3. Wait 15 minutes
4. Verify: Trade expired, no escrow locked, no penalties
```

### Escrow Safety Test

```
1. A initiates trade, F accepts, escrow locked
2. A marks fiat sent
3. F never confirms
4. Wait 2 hours
5. Verify: Auto-dispute raised OR escrow safely held
6. Manual resolution returns funds appropriately
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Network** | A private trading group with shared trust |
| **Founder** | Creator of a network, highest trust level |
| **Order** | A posted intention to buy or sell crypto |
| **Trade** | An active exchange between two parties |
| **Escrow** | Crypto held securely during fiat payment |
| **Reputation** | Trust score based on trading history |
| **Vouch** | (Post-MVP) Endorsement of a new user |
