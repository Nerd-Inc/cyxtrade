# P2P Mesh Network Architecture

> Decentralized messaging with onion routing for metadata privacy

CyxTrade uses the CyxWiz protocol for P2P mesh networking, providing E2E encrypted messaging with optional onion routing for anonymous delivery.

---

## Overview

### Current vs Target Architecture

**Current (Centralized Hub):**
```
User A ──[Socket.IO]──> Backend Server ──[Socket.IO]──> User B
                              │
                    Sees: sender, recipient, timing
                    Stores: encrypted messages
```

**Target (Decentralized P2P with Onion):**
```
User A ──[Onion Layer 1]──> Relay 1 ──[Onion Layer 2]──> Relay 2 ──> User B
   │                                                                    │
   └── DHT lookup for User B's address ─────────────────────────────────┘

Backend: Only for initial peer discovery + offline queue
```

### Key Components

| Component | Purpose | Library |
|-----------|---------|---------|
| **UDP Transport** | NAT traversal, hole punching | CyxWiz `udp.c` |
| **DHT** | Decentralized peer discovery | CyxWiz `dht.c` (Kademlia) |
| **Mesh Routing** | Multi-hop message delivery | CyxWiz `routing.c` |
| **Onion Routing** | Anonymous messaging | CyxWiz `onion.c` |
| **E2E Encryption** | Message confidentiality | X25519 + XChaCha20-Poly1305 |

---

## Message Delivery Paths

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE DELIVERY FLOW                         │
│                                                                  │
│   1. P2P Direct (fastest)                                        │
│      User A ────────────────────────────────────────> User B     │
│      • Direct UDP connection                                     │
│      • NAT hole punch succeeded                                  │
│      • Lowest latency                                            │
│                                                                  │
│   2. P2P Onion (anonymous)                                       │
│      User A ──> Hop 1 ──> Hop 2 ──> Hop 3 ──> User B            │
│      • 1-8 hop onion routing                                     │
│      • Each hop only sees prev/next                              │
│      • Metadata privacy                                          │
│                                                                  │
│   3. Backend Relay (fallback)                                    │
│      User A ──> Backend ──> User B                               │
│      • When P2P fails (NAT issues, offline)                      │
│      • Messages still E2E encrypted                              │
│      • Backend can see timing metadata                           │
│                                                                  │
│   4. Offline Queue (store & forward)                             │
│      User A ──> Backend Queue                                    │
│                     │                                            │
│                     └──> User B (when online)                    │
│      • 72-hour TTL                                               │
│      • 1MB per user limit                                        │
│      • Auto-delivered on connect                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Layer Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  SecureChatService (Dart)                                        │
│  • E2E encryption/decryption                                     │
│  • Trade-scoped key exchange                                     │
│  • Delivery method selection                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      P2P SERVICE LAYER                           │
│  P2PService (Dart)                                               │
│  • Native library wrapper                                        │
│  • Isolate-based polling                                         │
│  • Status management                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ FFI
┌───────────────────────────▼─────────────────────────────────────┐
│                     CYXWIZ NATIVE LAYER                          │
│  libcyxwiz_ffi.so/dll (C)                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   Onion     │ │    DHT      │ │   Router    │                │
│  │  (privacy)  │ │ (discovery) │ │  (routing)  │                │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                │
│         └───────────────┼───────────────┘                        │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────┐                │
│  │              UDP Transport                   │                │
│  │  • STUN (NAT traversal)                     │                │
│  │  • Hole punching                            │                │
│  │  • Relay fallback                           │                │
│  └──────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mobile/
├── native/
│   ├── CMakeLists.txt           # Cross-platform build config
│   ├── src/cyxwiz_ffi.c         # FFI wrapper for CyxWiz
│   ├── build_android.sh         # Android NDK build
│   ├── build_ios.sh             # iOS build (requires macOS)
│   └── build_windows.bat        # Windows build
│
├── android/app/src/main/jniLibs/
│   ├── arm64-v8a/
│   │   ├── libcyxwiz_ffi.so     # Native library
│   │   └── libsodium.so         # Crypto dependency
│   ├── armeabi-v7a/
│   └── x86_64/
│
└── lib/
    ├── ffi/
    │   └── cyxwiz_bindings.dart # Dart FFI declarations
    └── services/
        ├── p2p_service.dart     # High-level P2P API
        ├── p2p_isolate.dart     # Background polling
        ├── secure_chat_service.dart  # E2E + P2P integration
        └── crypto_service.dart  # Key management

backend/src/routes/
├── bootstrap.ts                 # P2P peer discovery bootstrap
└── relay.ts                     # Offline message queue
```

---

## Onion Routing

### How It Works

1. **Key Exchange** - Each peer announces X25519 public key
2. **Circuit Building** - Sender selects 1-8 relay hops
3. **Layered Encryption** - Message wrapped in layers (inside-out)
4. **Onion Peeling** - Each hop decrypts its layer, sees only next hop

```
Sender encrypts:
  Layer 3: Encrypt(destination + message, key_hop3)
  Layer 2: Encrypt(hop3_id + layer3, key_hop2)
  Layer 1: Encrypt(hop2_id + layer2, key_hop1)

Hop 1 receives layer1:
  Decrypt → sees hop2_id + layer2
  Forward layer2 to hop2

Hop 2 receives layer2:
  Decrypt → sees hop3_id + layer3
  Forward layer3 to hop3

Hop 3 receives layer3:
  Decrypt → sees destination + message
  Forward message to destination
```

### Privacy Properties

| Property | With Onion | Without |
|----------|------------|---------|
| Message content | Hidden (E2E) | Hidden (E2E) |
| Sender identity | Hidden from hops | Visible to all |
| Recipient identity | Hidden from hops | Visible to all |
| Timing correlation | Harder | Easy |
| Path visibility | Each hop sees prev/next only | Full path visible |

### Payload Capacity

Due to encryption overhead (40 bytes/layer) + node ID (32 bytes):

| Hops | Max Payload | Use Case |
|------|-------------|----------|
| 1 | 173 bytes | Fast, minimal anonymity |
| 2 | 101 bytes | Balanced |
| 3 | 29 bytes | Strong anonymity (fits short messages) |

For longer messages, chunking is required.

---

## DHT (Kademlia)

### Purpose

Find peer addresses without central server:

```
User A wants to message User B:
  1. A has B's node ID (derived from user ID)
  2. A queries DHT: "Who knows about node ID B?"
  3. DHT returns B's current address
  4. A connects directly to B
```

### How It Works

- **XOR Distance** - Nodes organized by XOR distance from local ID
- **K-Buckets** - 256 buckets (one per bit), each holds 8 nodes
- **Iterative Lookup** - Query 3 closest nodes in parallel
- **Convergence** - Each response gives closer nodes

### Bootstrap Flow

```
1. App starts
2. Register with bootstrap server (backend)
3. Get initial peer list (up to 20 peers)
4. Add peers to local DHT routing table
5. DHT takes over peer discovery
6. Bootstrap server no longer needed
```

---

## Backend Services

### Bootstrap Server (`/api/bootstrap`)

Provides initial peers for DHT bootstrap:

| Endpoint | Purpose |
|----------|---------|
| `POST /register` | Register node ID + onion pubkey |
| `POST /heartbeat` | Update last seen time |
| `GET /peers` | Get up to 20 active peers |
| `GET /peer/:userId` | Get specific user's node info |
| `DELETE /unregister` | Leave P2P network |

### Relay Server (`/api/relay`)

Offline message queue when P2P fails:

| Endpoint | Purpose |
|----------|---------|
| `POST /queue` | Queue encrypted message |
| `GET /pending` | Get pending messages |
| `DELETE /pending/:id` | Acknowledge delivery |
| `DELETE /pending` | Clear all messages |

**Limits:**
- TTL: 72 hours
- Max messages: 100 per user
- Max size: 1MB per user

---

## Security Model

### Encryption Layers

| Layer | Algorithm | Purpose |
|-------|-----------|---------|
| E2E Message | X25519 + XChaCha20-Poly1305 | Content confidentiality |
| Onion Layer | X25519 + XChaCha20-Poly1305 | Per-hop encryption |
| Trade Keys | HKDF from shared secret | Trade-scoped key derivation |

### Key Refresh

- **Onion keypair**: Refreshed hourly (circuit rotation)
- **Trade keys**: Per-trade, derived from main identity

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Message interception | E2E encryption |
| Metadata surveillance | Onion routing |
| Server compromise | No plaintext, no keys stored |
| NAT traversal failure | Relay fallback |
| Peer offline | Offline queue (72h) |

---

## Configuration

### P2P Service Options

```dart
// Initialize P2P
await p2pService.initialize(
  bootstrapAddress: 'api.cyxtrade.com:8443',
  nodeId: userNodeId,  // Optional: generate if null
);

// Set onion hop count (1-8)
p2pService.setHopCount(3);

// Get local node ID for sharing
final myNodeId = p2pService.localId;
```

### Secure Chat Integration

```dart
// Initialize P2P for chat
await secureChatService.initializeP2P(
  bootstrapAddress: 'api.cyxtrade.com:8443',
);

// Enable/disable onion routing
secureChatService.setUseOnionRouting(true);

// Send message (auto-selects P2P or relay)
await secureChatService.sendMessage(
  tradeId: 'trade-123',
  plaintext: 'Payment sent!',
  counterpartyId: 'user-456',
);
```

---

## Testing Checklist

### Phase 5: Onion Routing Flow

- [ ] **Native library loads** - No crash on initialization
- [ ] **Node ID generation** - 32-byte random ID created
- [ ] **Bootstrap registration** - Server accepts node ID
- [ ] **Peer discovery** - DHT finds other nodes
- [ ] **Direct P2P** - Message delivery without onion
- [ ] **Onion circuit** - Build 2-3 hop circuit
- [ ] **Onion delivery** - Message arrives via circuit
- [ ] **Relay fallback** - When P2P fails, use backend
- [ ] **Offline queue** - Messages delivered when online

### Debug Commands

```dart
// Check P2P status
print('Status: ${p2pService.status}');
print('Peers: ${p2pService.peerCount}');
print('Node ID: ${p2pService.localIdHex}');
print('Onion hops: ${p2pService.hopCount}');
```

---

## Future Enhancements

1. **Cover traffic** - Send dummy messages to prevent timing analysis
2. **Guard nodes** - Consistent entry points for path stability
3. **Hidden services** - Receive messages without revealing address
4. **Multi-path routing** - Split messages across multiple circuits
5. **LoRa/Bluetooth** - Mesh networking for offline regions

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system design
- [SECURITY_MODEL.md](./SECURITY_MODEL.md) - Security analysis
- [CyxWiz CLAUDE.md](../../CLAUDE.md) - Protocol implementation details
