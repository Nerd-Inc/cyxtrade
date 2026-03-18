# CyxTrade Pro - Deep Design Document

> Comprehensive design specification for CyxTrade Pro P2P trading platform

---

## Table of Contents

1. [Overview](#overview)
2. [User Flows](#user-flows)
3. [Screen Specifications](#screen-specifications)
4. [Component Library](#component-library)
5. [State Management](#state-management)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Navigation Structure](#navigation-structure)

---

## Overview

### What is CyxTrade Pro?

CyxTrade Pro transforms users into active P2P traders. Unlike the standard CyxTrade flow (user sends money to a pre-selected trader), Pro allows users to:

1. **Post Ads** - Create buy/sell advertisements with custom pricing
2. **Browse Marketplace** - Find the best rates from other traders
3. **Manage Orders** - Track all P2P transactions
4. **Build Reputation** - Earn ratings and verification badges

### Key Differences: Standard vs Pro

| Feature | Standard CyxTrade | CyxTrade Pro |
|---------|-------------------|--------------|
| User Role | Consumer only | Consumer + Trader |
| Trading | Select from trader list | Post own ads, respond to ads |
| Pricing | Accept trader rates | Set your own rates |
| Volume | Personal remittances | Higher volume trading |
| Bond Required | No | Yes (to post ads) |
| Verification | Basic | Enhanced (Email, SMS, KYC, Address) |

---

## User Flows

### Flow 1: First-time Pro Access

```
User clicks "CyxTrade Pro" on home
    ↓
Check if user is a trader
    ↓ NO: Show "Become a Pro Trader" onboarding
        → Explain benefits
        → Show bond requirements
        → Link to trader registration
    ↓ YES: Enter Pro Marketplace
```

### Flow 2: Posting an Ad

```
Trader clicks "+" or "Post Ad"
    ↓
Step 1: Set Type & Price
    → Select Buy/Sell
    → Choose Asset (USDT)
    → Choose Fiat Currency (XAF, AED, etc.)
    → Set Price Type (Fixed/Floating)
    → Enter Price
    ↓
Step 2: Set Amount & Method
    → Enter Total Amount
    → Set Order Limits (min-max)
    → Select Payment Methods (up to 5)
    → Set Payment Time Limit
    ↓
Step 3: Set Conditions
    → Add Terms Tags (optional)
    → Write Terms Text (optional)
    → Set Auto-reply Message (optional)
    → Set Counterparty Conditions (optional)
    ↓
Preview Ad
    → Review all details
    → Edit or Post
    ↓
Ad Goes Live
```

### Flow 3: Responding to an Ad (Buy USDT)

```
User browses marketplace
    ↓
Finds ad with good rate
    ↓
Clicks "Buy" button
    ↓
Buy Order Page
    → Enter amount (XAF or USDT)
    → See calculated receive amount
    → Select payment method
    → View advertiser info
    ↓
Click "Place Order"
    ↓
Order Created
    → Chat with trader
    → Make payment
    → Upload proof
    → Wait for release
    ↓
Order Completed
    → Rate trader
```

### Flow 4: Managing an Ad

```
Trader goes to "My Ads"
    ↓
Views list of ads
    ↓
Clicks "..." on ad card
    ↓
Actions Menu:
    → Quick Edit (price only)
    → Edit Details (full edit)
    → Share Ad
    → View More Details
    → Duplicate Ad
    → Close Ad
    ↓
Can also:
    → Toggle Online/Offline
    → Bulk select for online/offline
```

---

## Screen Specifications

### Screen 1: Pro Marketplace (Home)

**Route:** `/app/pro`

**Layout:**
```
┌─────────────────────────────────────┐
│ ← Express    P2P           [XAF ▼] │  Header
├─────────────────────────────────────┤
│ [Buy]  [Sell]                   🔔  │  Mode Toggle
├─────────────────────────────────────┤
│ 🪙USDT▼  Amount▼  Payment▼     🔽  │  Filters
├─────────────────────────────────────┤
│ Promoted Ad                      ✏️ │  Section
│ ┌─────────────────────────────────┐ │
│ │ 👤 VIP_TRADER ✓    MTN Mobile..│ │
│ │ Trade: 1882 (99.7%) 👍98.36%   │ │
│ │                     Orange...  │ │
│ │ Fr 605.00/USDT      Ecobank    │ │
│ │ Limit 10K-1.5M XAF  ⏱15min    │ │
│ │ Available 2,522 USDT   [Buy]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │  Trader Cards
│ │ 👤 MFS-Crypt        MTN Mobile │ │
│ │ Trade: 318 (96.1%) 👍99.65%    │ │
│ │ Fr 589.93/USDT      MoMo       │ │
│ │ Limit 1.5K-10K XAF  ⏱15min    │ │
│ │ Available 17.46 USDT   [Buy]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... more cards ...                  │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │  Bottom Nav
└─────────────────────────────────────┘
```

**Components:**
- `ProHeader` - Express/P2P tabs, currency selector
- `ModeToggle` - Buy/Sell switch
- `FilterBar` - Asset, Amount, Payment filters
- `AdCard` - Trader ad display
- `ProBottomNav` - Navigation tabs

**State:**
```typescript
interface MarketplaceState {
  mode: 'buy' | 'sell';
  asset: string;           // 'USDT'
  fiatCurrency: string;    // 'XAF', 'AED', etc.
  filters: {
    amountRange?: [number, number];
    paymentMethods?: string[];
  };
  ads: Ad[];
  promotedAds: Ad[];
  loading: boolean;
}
```

**API Calls:**
- `GET /api/pro/ads?type=sell&fiat=XAF` - Get ads for buying (sell ads)
- `GET /api/pro/ads?type=buy&fiat=XAF` - Get ads for selling (buy ads)

---

### Screen 2: Order History

**Route:** `/app/pro/orders`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←        Order History          📥  │  Header
├─────────────────────────────────────┤
│ [Ongoing]  [Fulfilled]        🔍 🔽 │  Tabs + Search
├─────────────────────────────────────┤
│ [All] [Completed] [Canceled]        │  Status Filter
├─────────────────────────────────────┤
│ ⓘ You have unread message        > │  Alert Banner
├─────────────────────────────────────┤
│ Sell USDT              [Completed]  │
│ Amount         Fr 412,964.6         │
│ Price          Fr 590               │
│ Total Quantity 700.00 USDT          │
│ Order    228628293871431... 📋      │
│ ┌──────────────────┐                │
│ │Ken-FastTradeLTD 💬│  03-05 15:02  │
│ └──────────────────┘                │
├─────────────────────────────────────┤
│ Sell USDT              [Canceled]   │
│ Amount         Fr 413,237.57        │
│ Price          Fr 590.39            │
│ Total Quantity 700.00 USDT          │
│ Order    228628274544670... 📋      │
│ ┌──────────────────┐                │
│ │SAID-EL-KEBIR 💬³ │  03-05 14:55   │
│ └──────────────────┘                │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │
└─────────────────────────────────────┘
```

**Components:**
- `OrderTabs` - Ongoing/Fulfilled toggle
- `StatusFilter` - All/Completed/Canceled pills
- `AlertBanner` - Unread messages notification
- `OrderCard` - Order summary with details

**State:**
```typescript
interface OrderHistoryState {
  tab: 'ongoing' | 'fulfilled';
  statusFilter: 'all' | 'completed' | 'canceled';
  orders: P2POrder[];
  loading: boolean;
}
```

---

### Screen 3: My Ads

**Route:** `/app/pro/ads`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←         My Ads        [+] 📋 ⏰   │  Header
├─────────────────────────────────────┤
│ Cryptos▼  Currency▼  Types▼  Status▼│  Filters
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Buy USDT With AED    [Online]🔘⋮│ │
│ │ د.إ 3.600                       │ │
│ │ Total amount      600.00 USDT   │ │
│ │ Limit    500K - 5M AED          │ │
│ │ 🟡Abu Dhabi Commercial Bank     │ │
│ │ 🟡ADIB: Abu Dhabi Islamic Bank  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Sell USDT With AED   [Online]🔘⋮│ │
│ │ د.إ 3.671                       │ │
│ │ Total amount      0.25 USDT     │ │
│ │ Limit    2.9M - 5M AED          │ │
│ │ 🟡Bank Transfer                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ No more data                        │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │
└─────────────────────────────────────┘
```

**Actions Menu (⋮):**
```
┌─────────────────────────────────────┐
│           More Actions              │
├─────────────────────────────────────┤
│ ✏️  Quick Edit                      │
│ 📝 Edit Details                     │
│ 🔗 Share Ad                         │
│ 👁️  View More Details               │
│ 📋 Duplicate Ad                     │
│ ❌ Close Ad                         │
└─────────────────────────────────────┘
```

**Components:**
- `AdFilters` - Multi-select filters
- `MyAdCard` - Ad with online toggle and actions
- `AdActionsSheet` - Bottom sheet with actions
- `FAB` - Floating action button for new ad

---

### Screen 4: Post Ad Wizard

**Route:** `/app/pro/ads/new`

#### Step 1: Set Type & Price

```
┌─────────────────────────────────────┐
│ ←       Post Normal Ad          ❓  │
├─────────────────────────────────────┤
│ ①────────────②────────────③        │  Progress
│ Set Type    Set Amount   Set        │
│ & Price     & Method     Conditions │
├─────────────────────────────────────┤
│                                     │
│ I want to                           │
│ ┌───────────┐ ┌───────────┐         │
│ │    Buy    │ │    Sell   │         │
│ └───────────┘ └───────────┘         │
│                                     │
│ Asset              With Fiat        │
│ ┌───────────┐ ┌───────────┐         │
│ │  USDT  ▼  │ │  XAF   ▼  │         │
│ └───────────┘ └───────────┘         │
│                                     │
│ Price Type                          │
│ ┌─────────────────────────────────┐ │
│ │  Fixed                       ▼  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Fixed                               │
│ ┌─────────────────────────────────┐ │
│ │  [−]      567.87          [+]   │ │
│ └─────────────────────────────────┘ │
│ Price range: 454.30 - 681.44        │
│                                     │
│ Your Price    Fr567.87              │
│ Lowest Ad Price  Fr590.20           │
│                                     │
├─────────────────────────────────────┤
│            [ Next ]                 │
└─────────────────────────────────────┘
```

#### Step 2: Set Amount & Method

```
┌─────────────────────────────────────┐
│ ←       Post Normal Ad          ❓  │
├─────────────────────────────────────┤
│ ✓────────────②────────────③        │
│ Set Type    Set Amount   Set        │
│ & Price     & Method     Conditions │
├─────────────────────────────────────┤
│                                     │
│ Total amount                        │
│ ┌─────────────────────────────────┐ │
│ │ Please enter total amount  USDT │ │
│ │ All                             │ │
│ └─────────────────────────────────┘ │
│ ≈ 0.00XAF                           │
│ Available: 246.33 USDT ⊕            │
│                                     │
│ Order Limit ⓘ                       │
│ ┌──────────┐     ┌──────────┐       │
│ │   1500   │ XAF │ 1500000  │ XAF   │
│ └──────────┘  ~  └──────────┘       │
│ ≈ 2.53 USDT      ≈ 2,533.78 USDT    │
│                                     │
│ Payment Method            [+ Add]   │
│ Select up to 5 methods.             │
│                                     │
│ Payment Time Limit ⓘ                │
│ ┌─────────────────────────────────┐ │
│ │  15 Min                      ▼  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Reserved Fee: 0 USDT                │
├─────────────────────────────────────┤
│    [Previous]        [ Next ]       │
└─────────────────────────────────────┘
```

#### Step 3: Set Conditions

```
┌─────────────────────────────────────┐
│ ←       Post Normal Ad          ❓  │
├─────────────────────────────────────┤
│ ✓────────────✓────────────③        │
├─────────────────────────────────────┤
│                                     │
│ Terms Tags (Optional)               │
│ ┌─────────────────────────────────┐ │
│ │  Add tags                    ▼  │ │
│ └─────────────────────────────────┘ │
│ Select up to 3 tags                 │
│                                     │
│ Terms (Optional)                    │
│ ┌─────────────────────────────────┐ │
│ │ Terms will be displayed to the  │ │
│ │ counterparty                    │ │
│ │                                 │ │
│ │                        0/1000 ↗ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Auto-reply (Optional)               │
│ ┌─────────────────────────────────┐ │
│ │ The auto-reply message will be  │ │
│ │ sent to the counterparty once   │ │
│ │ the order is created.           │ │
│ │                        0/1000 ↗ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Counterparty Conditions             │
│ Adding counterparty requirements    │
│ will reduce the exposure of your Ad │
│                                     │
├─────────────────────────────────────┤
│    [Previous]        [Preview]      │
└─────────────────────────────────────┘
```

#### Preview Ad

```
┌─────────────────────────────────────┐
│           Preview Ad            ━━  │  Bottom Sheet
├─────────────────────────────────────┤
│                                     │
│ Sell USDT With XAF        [Online]  │
│                                     │
│ Price               Fr592.00        │
│ Price Type          Fixed           │
│ Total Amount        240.00 USDT     │
│ Actual Amount       239.52 USDT     │
│ Reserved Fee        0.48 USDT       │
│ Limit      1,500 - 1,500,000 XAF    │
│                                     │
│ Payment Methods   🟡MTN Mobile Money│
│                                     │
│ Payment Time Limit  15 Minutes      │
│                                     │
│ Display to Users In All Region(s)   │
│                                     │
│ Remarks     flot or withdraw and    │
│             no 3rd party            │
│                                     │
├─────────────────────────────────────┤
│      [Edit]           [Post]        │
└─────────────────────────────────────┘
```

---

### Screen 5: P2P Chat/Messages

**Route:** `/app/pro/chat`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←        P2P Message         [M][+] │
├─────────────────────────────────────┤
│ 🔍 Search by nickname               │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 💬 Go to Main Chat      13:12   │ │
│ │    Chat as MrCJ12               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 👤 SAID-EL-KEBIR ✓   Yesterday │³│
│ │    Request expired due to...    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 Ken-FastTradeLTD ✓ Yesterday │ │
│ │    You have released the crypto │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👤 User-0b628        Yesterday  │ │
│ │    [Image]                      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👤 User-e86ad           03/04   │ │
│ │    yes proceed                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... more conversations ...          │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │
└─────────────────────────────────────┘
```

---

### Screen 6: Trader Profile

**Route:** `/app/pro/profile`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←                              🔗   │
├─────────────────────────────────────┤
│       ┌───────┐                     │
│       │   M   │                     │
│       └───────┘                     │
│       MrCJ12 ✏️                      │
│       Verified user                 │
│ ✓Email  ✓SMS  ✓KYC  ✓Address        │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │   15          │    100.00%      │ │
│ │ 30d Trades    │ 30d Completion  │ │
│ │               │     Rate        │ │
│ │  4.39 m       │     3.99 m      │ │
│ │ Avg. Release  │   Avg. Pay      │ │
│ │    Time       │     Time        │ │
│ │                                 │ │
│ │            More ▼               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [Trade] [Notifications] [Others]    │
├─────────────────────────────────────┤
│ 👍 Received Feedback           355 >│
│ 💳 Payment Method(s)             6 >│
│ 🔓 Restrictions Removal Center    > │
│ 👥 Follows                        > │
│ 🚫 Blocked Users                  > │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │
└─────────────────────────────────────┘
```

---

### Screen 7: Buy Order Page

**Route:** `/app/pro/buy/:adId`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←      🪙 Buy USDT                  │
│         Price Fr 589.96 🔄          │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [By XAF]  [By USDT]             │ │
│ │  ━━━━━                          │ │
│ │                                 │ │
│ │ ○               XAF [Max]       │ │
│ │                                 │ │
│ │ Limit 15000 - 28756 XAF         │ │
│ │                                 │ │
│ │ You Receive  0 USDT             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 MTN Mobile Money          2 >│ │
│ └─────────────────────────────────┘ │
│                                     │
│ Subscribe to Earn                   │
│ Enable Auto-Earn 3.89% APR    [  ] │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ Advertiser's Info                   │
│ Legitplug237             ● Online > │
│                                     │
├─────────────────────────────────────┤
│          [Place Order]              │  Green button
└─────────────────────────────────────┘
```

---

### Screen 8: Sell Order Page

**Route:** `/app/pro/sell/:adId`

**Layout:**
```
┌─────────────────────────────────────┐
│ ←      🪙 Sell USDT                 │
│         Price Fr 592.00 🔄          │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [By XAF]  [By USDT]             │ │
│ │            ━━━━━                │ │
│ │                                 │ │
│ │ ○               USDT [All]      │ │
│ │                                 │ │
│ │ Limit 42.70 - 2533.78 USDT      │ │
│ │ Balance 6.8E-7 USDT ⊕           │ │
│ │                                 │ │
│ │ You Receive  0 XAF              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Select a payment method       > │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ Advertiser's Info                   │
│ IB_USDT_Gabon ✓          ● Online > │
│                                     │
│ Gabon uniquement, Gabon only        │
│                                     │
├─────────────────────────────────────┤
│          [Place Order]              │  Red/Pink button
└─────────────────────────────────────┘
```

---

### Screen 9: Express Mode

**Route:** `/app/pro` (Express tab)

**Layout:**
```
┌─────────────────────────────────────┐
│ ← [Express]  P2P           [XAF ▼] │
├─────────────────────────────────────┤
│ [Buy]  [Sell]                    🔽 │
├─────────────────────────────────────┤
│ 🪙 USDT 3.89% APR ▼                 │
├─────────────────────────────────────┤
│                                     │
│                                     │
│         ○                           │
│         XAF                         │
│                                     │
│    ↕️ 0 USDT  1 USDT ≈ 589.96 XAF   │
│                                     │
│                                     │
│                              ⓘ      │
│                                     │
│ ┌────────┬────────┬────────┬──────┐ │
│ │ Fr3K   │ Fr20K  │ Fr80K  │Fr200K│ │  Quick amounts
│ └────────┴────────┴────────┴──────┘ │
│                                     │
│ ┌─────┬─────┬─────┐                 │
│ │  1  │  2  │  3  │                 │
│ ├─────┼─────┼─────┤                 │
│ │  4  │  5  │  6  │                 │  Numpad
│ ├─────┼─────┼─────┤                 │
│ │  7  │  8  │  9  │                 │
│ ├─────┼─────┼─────┤                 │
│ │  .  │  0  │  ⌫  │                 │
│ └─────┴─────┴─────┘                 │
├─────────────────────────────────────┤
│ [Home] [Orders] [Ads] [Chat] [Prof] │
└─────────────────────────────────────┘
```

---

## Component Library

### Core Components

```typescript
// Pro-specific components
components/pro/
├── layout/
│   ├── ProHeader.tsx          // Express/P2P tabs + currency
│   ├── ProBottomNav.tsx       // 5-tab navigation
│   └── ProLayout.tsx          // Wrapper with nav
├── marketplace/
│   ├── ModeToggle.tsx         // Buy/Sell switch
│   ├── FilterBar.tsx          // Asset, Amount, Payment filters
│   ├── AdCard.tsx             // Trader ad card
│   └── PromotedBadge.tsx      // "Promoted Ad" label
├── orders/
│   ├── OrderTabs.tsx          // Ongoing/Fulfilled
│   ├── StatusFilter.tsx       // All/Completed/Canceled pills
│   ├── OrderCard.tsx          // Order summary card
│   └── AlertBanner.tsx        // Unread messages alert
├── ads/
│   ├── MyAdCard.tsx           // Ad with toggle + actions
│   ├── AdActionsSheet.tsx     // Bottom sheet actions
│   ├── AdFilters.tsx          // Multi-filter bar
│   ├── OnlineToggle.tsx       // Online/Offline switch
│   └── PostAdWizard/
│       ├── Step1TypePrice.tsx
│       ├── Step2AmountMethod.tsx
│       ├── Step3Conditions.tsx
│       ├── PreviewAd.tsx
│       └── WizardProgress.tsx
├── order/
│   ├── AmountInput.tsx        // By XAF / By USDT input
│   ├── PaymentMethodSelect.tsx
│   ├── AdvertiserInfo.tsx
│   └── PlaceOrderButton.tsx
├── chat/
│   ├── ConversationList.tsx
│   ├── ConversationItem.tsx
│   └── SearchBar.tsx
└── profile/
    ├── ProfileHeader.tsx      // Avatar, name, badges
    ├── StatsCard.tsx          // Trade stats
    ├── ProfileMenu.tsx        // Settings links
    └── VerificationBadges.tsx
```

### Shared Components

```typescript
// Reusable UI elements
components/ui/
├── BottomSheet.tsx
├── Pill.tsx                   // Filter pill button
├── Toggle.tsx                 // On/Off switch
├── PriceInput.tsx             // +/- stepper
├── CurrencySelect.tsx
├── ProgressStepper.tsx        // 3-step wizard progress
├── Badge.tsx                  // Status badges
├── Avatar.tsx
└── Numpad.tsx                 // Express mode keypad
```

---

## State Management

### Zustand Stores

```typescript
// stores/pro.ts

interface Ad {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar?: string;
  traderVerified: boolean;
  traderTrades: number;
  traderCompletionRate: number;
  traderRating: number;
  type: 'buy' | 'sell';
  asset: string;
  fiatCurrency: string;
  price: number;
  priceType: 'fixed' | 'floating';
  totalAmount: number;
  availableAmount: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: PaymentMethod[];
  paymentTimeLimit: number;
  terms?: string;
  autoReply?: string;
  status: 'online' | 'offline' | 'closed';
  isPromoted: boolean;
  createdAt: string;
}

interface P2POrder {
  id: string;
  orderNumber: string;
  adId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  totalFiat: number;
  asset: string;
  fiatCurrency: string;
  status: 'pending' | 'paid' | 'released' | 'completed' | 'canceled' | 'disputed';
  counterparty: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
  paymentMethod?: PaymentMethod;
  createdAt: string;
  paidAt?: string;
  releasedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  unreadMessages: number;
}

interface ProStore {
  // Marketplace
  marketMode: 'buy' | 'sell';
  selectedAsset: string;
  selectedFiat: string;
  ads: Ad[];
  promotedAds: Ad[];
  adsLoading: boolean;

  // Orders
  orders: P2POrder[];
  ordersLoading: boolean;

  // My Ads
  myAds: Ad[];
  myAdsLoading: boolean;

  // Current Order
  currentOrder: P2POrder | null;

  // Post Ad Draft
  adDraft: Partial<Ad>;

  // Actions
  setMarketMode: (mode: 'buy' | 'sell') => void;
  setFiat: (fiat: string) => void;
  fetchAds: (filters?: AdFilters) => Promise<void>;
  fetchOrders: (tab: 'ongoing' | 'fulfilled', status?: string) => Promise<void>;
  fetchMyAds: () => Promise<void>;
  createAd: (ad: CreateAdPayload) => Promise<Ad>;
  updateAd: (id: string, updates: Partial<Ad>) => Promise<void>;
  toggleAdOnline: (id: string, online: boolean) => Promise<void>;
  closeAd: (id: string) => Promise<void>;
  duplicateAd: (id: string) => Promise<Ad>;
  placeOrder: (adId: string, amount: number, paymentMethodId?: string) => Promise<P2POrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  markOrderPaid: (orderId: string, reference?: string) => Promise<void>;
  releaseOrder: (orderId: string) => Promise<void>;
  updateAdDraft: (updates: Partial<Ad>) => void;
  clearAdDraft: () => void;
}
```

---

## API Endpoints

### Ads Endpoints

```
# List ads (marketplace)
GET /api/pro/ads
Query params:
  - type: 'buy' | 'sell'
  - asset: string (default: 'USDT')
  - fiat: string (required)
  - minAmount?: number
  - maxAmount?: number
  - paymentMethods?: string[] (comma-separated)
  - page?: number
  - limit?: number
Response: { ads: Ad[], promotedAds: Ad[], total: number }

# Get single ad
GET /api/pro/ads/:id
Response: Ad

# Create ad
POST /api/pro/ads
Body: CreateAdPayload
Response: Ad

# Update ad
PUT /api/pro/ads/:id
Body: Partial<Ad>
Response: Ad

# Toggle ad online/offline
PUT /api/pro/ads/:id/status
Body: { online: boolean }
Response: { success: true }

# Close ad
DELETE /api/pro/ads/:id
Response: { success: true }

# Duplicate ad
POST /api/pro/ads/:id/duplicate
Response: Ad

# Get my ads
GET /api/pro/ads/mine
Query params:
  - status?: 'online' | 'offline' | 'closed'
  - asset?: string
  - fiat?: string
  - type?: 'buy' | 'sell'
Response: { ads: Ad[] }
```

### Orders Endpoints

```
# List orders
GET /api/pro/orders
Query params:
  - tab: 'ongoing' | 'fulfilled'
  - status?: 'all' | 'completed' | 'canceled'
  - page?: number
  - limit?: number
Response: { orders: P2POrder[], total: number }

# Get single order
GET /api/pro/orders/:id
Response: P2POrder

# Create order (respond to ad)
POST /api/pro/orders
Body: {
  adId: string;
  amount: number;
  paymentMethodId?: string;
}
Response: P2POrder

# Mark order as paid
PUT /api/pro/orders/:id/paid
Body: { reference?: string }
Response: P2POrder

# Release order (trader releases funds)
PUT /api/pro/orders/:id/release
Response: P2POrder

# Cancel order
PUT /api/pro/orders/:id/cancel
Body: { reason?: string }
Response: P2POrder

# Dispute order
POST /api/pro/orders/:id/dispute
Body: { reason: string }
Response: { disputeId: string }
```

### Chat Endpoints

```
# List conversations
GET /api/pro/chat
Response: { conversations: Conversation[] }

# Get messages for order
GET /api/pro/chat/:orderId
Query params:
  - before?: string (cursor)
  - limit?: number
Response: { messages: Message[], hasMore: boolean }

# Send message
POST /api/pro/chat/:orderId
Body: { content: string, type?: 'text' | 'image' }
Response: Message

# Mark as read
PUT /api/pro/chat/:orderId/read
Response: { success: true }
```

### Profile Endpoints

```
# Get trader stats
GET /api/pro/profile/stats
Response: {
  trades30d: number;
  completionRate30d: number;
  avgReleaseTime: number;  // minutes
  avgPayTime: number;      // minutes
  totalTrades: number;
  rating: number;
  feedbackCount: number;
}

# Get received feedback
GET /api/pro/profile/feedback
Query params:
  - page?: number
  - limit?: number
Response: { feedback: Feedback[], total: number }

# Get follows
GET /api/pro/profile/follows
Response: { follows: User[] }

# Get blocked users
GET /api/pro/profile/blocked
Response: { blocked: User[] }

# Block user
POST /api/pro/profile/blocked
Body: { userId: string }
Response: { success: true }

# Unblock user
DELETE /api/pro/profile/blocked/:userId
Response: { success: true }
```

---

## Database Schema

```sql
-- ============================================
-- CYXTRADE PRO DATABASE SCHEMA ADDITIONS
-- ============================================

-- Ads table (trader advertisements)
CREATE TABLE ads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
    fiat_currency       VARCHAR(3) NOT NULL,
    price_type          VARCHAR(10) NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'floating')),
    price               DECIMAL(12,6) NOT NULL,
    floating_margin     DECIMAL(5,2),  -- For floating price type (e.g., -2.5% or +1.5%)
    total_amount        DECIMAL(18,8) NOT NULL,
    available_amount    DECIMAL(18,8) NOT NULL,
    min_limit           DECIMAL(12,2) NOT NULL,
    max_limit           DECIMAL(12,2) NOT NULL,
    payment_time_limit  INTEGER NOT NULL DEFAULT 15,  -- minutes
    terms_tags          TEXT[],  -- Array of tags
    terms               TEXT,
    auto_reply          TEXT,
    remarks             TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'closed')),
    is_promoted         BOOLEAN DEFAULT FALSE,
    promoted_until      TIMESTAMP,
    region_restrictions TEXT[],  -- Array of region codes, NULL = all regions
    counterparty_conditions JSONB,  -- { minTrades: 10, minCompletionRate: 95, kycRequired: true }
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    closed_at           TIMESTAMP
);

-- Ad payment methods (many-to-many)
CREATE TABLE ad_payment_methods (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id               UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    payment_method_id   UUID NOT NULL REFERENCES trader_payment_methods(id) ON DELETE CASCADE,
    is_recommended      BOOLEAN DEFAULT FALSE,
    UNIQUE(ad_id, payment_method_id)
);

-- P2P Orders
CREATE TABLE p2p_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        VARCHAR(20) UNIQUE NOT NULL,
    ad_id               UUID NOT NULL REFERENCES ads(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    trader_id           UUID NOT NULL REFERENCES traders(id),
    type                VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
    asset               VARCHAR(10) NOT NULL DEFAULT 'USDT',
    fiat_currency       VARCHAR(3) NOT NULL,
    amount              DECIMAL(18,8) NOT NULL,  -- Crypto amount
    price               DECIMAL(12,6) NOT NULL,
    total_fiat          DECIMAL(12,2) NOT NULL,
    payment_method_id   UUID REFERENCES trader_payment_methods(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'releasing', 'released', 'completed', 'canceled', 'disputed', 'expired')),
    payment_reference   VARCHAR(100),
    payment_proof_url   VARCHAR(500),
    auto_reply_sent     BOOLEAN DEFAULT FALSE,
    expires_at          TIMESTAMP,  -- Order expiration (payment_time_limit from ad)
    created_at          TIMESTAMP DEFAULT NOW(),
    paid_at             TIMESTAMP,
    released_at         TIMESTAMP,
    completed_at        TIMESTAMP,
    canceled_at         TIMESTAMP,
    canceled_by         UUID REFERENCES users(id),
    cancel_reason       TEXT
);

-- P2P Chat Messages (separate from trade chat)
CREATE TABLE p2p_messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES users(id),
    message_type        VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system', 'payment_proof')),
    content             TEXT,
    image_url           VARCHAR(500),
    read_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Trader Follows
CREATE TABLE trader_follows (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trader_id           UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, trader_id)
);

-- Blocked Users (P2P)
CREATE TABLE p2p_blocked_users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason              TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- P2P Feedback (ratings for orders)
CREATE TABLE p2p_feedback (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES p2p_orders(id),
    from_user_id        UUID NOT NULL REFERENCES users(id),
    to_trader_id        UUID NOT NULL REFERENCES traders(id),
    rating              VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
    comment             TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id, from_user_id)
);

-- Indexes
CREATE INDEX idx_ads_trader_id ON ads(trader_id);
CREATE INDEX idx_ads_type_fiat_status ON ads(type, fiat_currency, status);
CREATE INDEX idx_ads_status ON ads(status);
CREATE INDEX idx_ads_is_promoted ON ads(is_promoted) WHERE is_promoted = TRUE;
CREATE INDEX idx_ad_payment_methods_ad_id ON ad_payment_methods(ad_id);

CREATE INDEX idx_p2p_orders_user_id ON p2p_orders(user_id);
CREATE INDEX idx_p2p_orders_trader_id ON p2p_orders(trader_id);
CREATE INDEX idx_p2p_orders_ad_id ON p2p_orders(ad_id);
CREATE INDEX idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX idx_p2p_orders_created_at ON p2p_orders(created_at);

CREATE INDEX idx_p2p_messages_order_id ON p2p_messages(order_id);
CREATE INDEX idx_p2p_messages_created_at ON p2p_messages(created_at);

CREATE INDEX idx_p2p_feedback_to_trader ON p2p_feedback(to_trader_id);

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
BEGIN
    new_number := CONCAT(
        TO_CHAR(NOW(), 'YYYYMMDD'),
        LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0')
    );
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Update available_amount when order is created
CREATE OR REPLACE FUNCTION update_ad_available_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ads
        SET available_amount = available_amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.ad_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If order is canceled, restore the amount
        IF NEW.status IN ('canceled', 'expired') AND OLD.status NOT IN ('canceled', 'expired') THEN
            UPDATE ads
            SET available_amount = available_amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.ad_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_available
    AFTER INSERT OR UPDATE ON p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_available_amount();
```

---

## Navigation Structure

### Route Configuration

```typescript
// router.tsx additions

import { ProLayout } from './components/pro/layout/ProLayout';
import ProMarketplace from './pages/pro/Marketplace';
import ProOrders from './pages/pro/Orders';
import ProAds from './pages/pro/Ads';
import PostAd from './pages/pro/PostAd';
import EditAd from './pages/pro/EditAd';
import ProChat from './pages/pro/Chat';
import ProChatRoom from './pages/pro/ChatRoom';
import ProProfile from './pages/pro/Profile';
import BuyOrder from './pages/pro/BuyOrder';
import SellOrder from './pages/pro/SellOrder';
import OrderDetails from './pages/pro/OrderDetails';

const proRoutes = [
  {
    path: '/app/pro',
    element: <ProLayout />,
    children: [
      { index: true, element: <ProMarketplace /> },
      { path: 'orders', element: <ProOrders /> },
      { path: 'orders/:id', element: <OrderDetails /> },
      { path: 'ads', element: <ProAds /> },
      { path: 'ads/new', element: <PostAd /> },
      { path: 'ads/:id/edit', element: <EditAd /> },
      { path: 'chat', element: <ProChat /> },
      { path: 'chat/:orderId', element: <ProChatRoom /> },
      { path: 'profile', element: <ProProfile /> },
      { path: 'buy/:adId', element: <BuyOrder /> },
      { path: 'sell/:adId', element: <SellOrder /> },
    ],
  },
];
```

### Bottom Navigation Config

```typescript
const proNavItems = [
  { path: '/app/pro', icon: HomeIcon, label: 'Home' },
  { path: '/app/pro/orders', icon: OrdersIcon, label: 'Orders', badge: unreadOrders },
  { path: '/app/pro/ads', icon: AdsIcon, label: 'Ads' },
  { path: '/app/pro/chat', icon: ChatIcon, label: 'Chat', badge: unreadMessages },
  { path: '/app/pro/profile', icon: ProfileIcon, label: 'Profile' },
];
```

---

## Next Steps

1. **Backend Implementation**
   - Add database migrations
   - Create Pro routes and controllers
   - Implement service layer
   - Add WebSocket for real-time order updates

2. **Frontend Implementation**
   - Create Pro store (Zustand)
   - Build component library
   - Implement pages
   - Add navigation

---

*Document Version: 1.0*
*Last Updated: 2026-03-18*
