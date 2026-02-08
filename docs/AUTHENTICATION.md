# CyxTrade Authentication

> Anonymous keypair-based authentication for privacy-first identity.

---

## Overview

CyxTrade uses **Ed25519 keypair authentication** instead of traditional phone/email login. This aligns with the CyxWiz philosophy:

> *"Own Nothing. Access Everything. Leave No Trace."*

**Key Properties:**
- No phone number or email required
- Identity = Public key fingerprint (same as CyxChat node_id)
- Private key never leaves the device
- User controls their identity completely

---

## Identity Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER IDENTITY                             │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Ed25519 Keypair                       │   │
│   │                                                          │   │
│   │   Private Key (32 bytes)     Public Key (32 bytes)      │   │
│   │   ────────────────────       ─────────────────────      │   │
│   │   • Stored securely          • Shared with server        │   │
│   │   • Never transmitted        • User identity             │   │
│   │   • Used for signing         • 64-char hex string        │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Fingerprint                         │   │
│   │                                                          │   │
│   │   First 16 characters of public key                      │   │
│   │   Example: "a1b2c3d4e5f67890"                            │   │
│   │                                                          │   │
│   │   Used for:                                              │   │
│   │   • Display to users                                     │   │
│   │   • Quick identification                                 │   │
│   │   • Avatar generation                                    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Identity Structure

```typescript
interface Identity {
  publicKey: string;      // 64-char hex (32 bytes)
  fingerprint: string;    // First 16 chars of publicKey
  createdAt: Date;        // When identity was generated
}
```

---

## Authentication Flow

### Challenge-Response Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
│                                                                  │
│   Client                         Server                          │
│     │                              │                             │
│     │  1. POST /auth/challenge     │                             │
│     │  { publicKey: "a1b2..." }    │                             │
│     │ ────────────────────────────►│                             │
│     │                              │                             │
│     │                              │  Generate random challenge  │
│     │                              │  (32 bytes, hex encoded)    │
│     │                              │  Store in Redis (5 min TTL) │
│     │                              │                             │
│     │  2. Response                 │                             │
│     │  { challenge: "f7e8...",     │                             │
│     │    expiresAt: 1234567890 }   │                             │
│     │ ◄────────────────────────────│                             │
│     │                              │                             │
│     │  Sign challenge with         │                             │
│     │  private key (Ed25519)       │                             │
│     │                              │                             │
│     │  3. POST /auth/verify-signature                            │
│     │  { publicKey: "a1b2...",     │                             │
│     │    signature: "d4c5..." }    │                             │
│     │ ────────────────────────────►│                             │
│     │                              │                             │
│     │                              │  Verify Ed25519 signature   │
│     │                              │  Get/create user by pubkey  │
│     │                              │  Generate JWT token         │
│     │                              │                             │
│     │  4. Response                 │                             │
│     │  { token: "eyJ...",          │                             │
│     │    user: { id, ... } }       │                             │
│     │ ◄────────────────────────────│                             │
│     │                              │                             │
│     │  Store JWT for API calls     │                             │
│     │                              │                             │
└─────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Process

1. **Client requests challenge**
   - Sends public key to `/auth/challenge`
   - Server generates random 32-byte challenge
   - Challenge stored in Redis with 5-minute TTL

2. **Client signs challenge**
   - Uses Ed25519 private key to sign challenge bytes
   - Produces 64-byte signature

3. **Server verifies signature**
   - Retrieves stored challenge
   - Verifies Ed25519 signature against public key
   - Clears challenge from Redis (single-use)

4. **User lookup/creation**
   - Searches for user by public key
   - Creates new user if not found
   - Returns JWT token for authenticated requests

---

## First-Time User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER REGISTRATION                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. App Launch (First Time)                               │   │
│  │                                                           │   │
│  │     • Check secure storage for existing keypair           │   │
│  │     • No keypair found → Show "Get Started" screen        │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  2. User Taps "Get Started"                               │   │
│  │                                                           │   │
│  │     • Generate Ed25519 keypair                            │   │
│  │     • Store private key in secure storage                 │   │
│  │     • Extract public key and fingerprint                  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  3. Challenge-Response Auth                               │   │
│  │                                                           │   │
│  │     • Request challenge from server                       │   │
│  │     • Sign challenge with private key                     │   │
│  │     • Submit signature for verification                   │   │
│  │     • Receive JWT token                                   │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4. Server Creates User                                   │   │
│  │                                                           │   │
│  │     • New user record with public_key                     │   │
│  │     • Fingerprint stored for display                      │   │
│  │     • No PII collected                                    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  5. User Arrives at Home Screen                           │   │
│  │                                                           │   │
│  │     • Full access to app features                         │   │
│  │     • Should be prompted to backup key                    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Returning User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RETURNING USER LOGIN                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. App Launch                                            │   │
│  │                                                           │   │
│  │     • Check secure storage for existing keypair           │   │
│  │     • Keypair found → Show "Welcome Back" screen          │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  2. User Taps "Continue"                                  │   │
│  │                                                           │   │
│  │     • Load keypair from secure storage                    │   │
│  │     • Perform challenge-response auth                     │   │
│  │     • Receive JWT token                                   │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  3. User Arrives at Home Screen                           │   │
│  │                                                           │   │
│  │     • Previous identity restored                          │   │
│  │     • Trade history, reputation intact                    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Backup & Recovery

### Backup Key Format

The private key is exported as a 64-character hexadecimal string:

```
Example: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
         └──────────────────────────────────────────────────────────────┘
                              64 characters (32 bytes)
```

### Backup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     KEY BACKUP FLOW                              │
│                                                                  │
│   User                         App                               │
│     │                           │                                │
│     │  Navigate to Settings     │                                │
│     │ ─────────────────────────►│                                │
│     │                           │                                │
│     │  Tap "Backup Identity"    │                                │
│     │ ─────────────────────────►│                                │
│     │                           │                                │
│     │                           │  Show warning:                 │
│     │                           │  "Anyone with this key         │
│     │                           │   can access your account"     │
│     │                           │                                │
│     │  Confirm understanding    │                                │
│     │ ─────────────────────────►│                                │
│     │                           │                                │
│     │                           │  Export private key from       │
│     │                           │  secure storage as hex         │
│     │                           │                                │
│     │  Display backup key       │                                │
│     │ ◄─────────────────────────│                                │
│     │                           │                                │
│     │  Options:                 │                                │
│     │  • Copy to clipboard      │                                │
│     │  • Save to file           │                                │
│     │  • Write down manually    │                                │
│     │                           │                                │
└─────────────────────────────────────────────────────────────────┘
```

### Recovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEY RECOVERY FLOW                             │
│                                                                  │
│   User                         App                               │
│     │                           │                                │
│     │  Tap "Recover Account"    │                                │
│     │ ─────────────────────────►│                                │
│     │                           │                                │
│     │                           │  Show backup key input field   │
│     │                           │                                │
│     │  Enter 64-char backup key │                                │
│     │ ─────────────────────────►│                                │
│     │                           │                                │
│     │                           │  Validate format:              │
│     │                           │  • Exactly 64 characters       │
│     │                           │  • Valid hex (0-9, a-f)        │
│     │                           │                                │
│     │                           │  Derive public key from        │
│     │                           │  private key                   │
│     │                           │                                │
│     │                           │  Store keypair in              │
│     │                           │  secure storage                │
│     │                           │                                │
│     │                           │  Perform login flow            │
│     │                           │                                │
│     │  Success: redirected to   │                                │
│     │  home with restored       │                                │
│     │  identity                 │                                │
│     │ ◄─────────────────────────│                                │
│     │                           │                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Platform Implementations

### Web (React + IndexedDB)

```typescript
// Key Storage: IndexedDB with encryption
interface CryptoKeyStore {
  privateKey: Uint8Array;   // Ed25519 seed (32 bytes)
  publicKey: Uint8Array;    // Ed25519 public key (32 bytes)
  createdAt: number;        // Timestamp
}

// Library: @noble/ed25519
import * as ed from '@noble/ed25519';

// Generate keypair
const privateKey = crypto.getRandomValues(new Uint8Array(32));
const publicKey = await ed.getPublicKeyAsync(privateKey);

// Sign challenge
const signature = await ed.signAsync(challengeBytes, privateKey);
```

**Storage Location:** IndexedDB database `cyxtrade-keys`

### Mobile (Flutter + Secure Storage)

```dart
// Key Storage: flutter_secure_storage (Keychain/Keystore)
class IdentityService {
  final _storage = FlutterSecureStorage();
  final _ed25519 = Ed25519();  // from cryptography package

  // Generate keypair
  Future<Identity> _generateNewIdentity() async {
    final keyPair = await _ed25519.newKeyPair();
    final privateKeyData = await keyPair.extract();
    final publicKey = await keyPair.extractPublicKey();

    // Store securely
    await _storage.write(
      key: 'identity_private_key',
      value: _bytesToHex(privateKeyData.bytes),
    );

    return Identity(
      publicKey: _bytesToHex(publicKey.bytes),
      fingerprint: publicKeyHex.substring(0, 16),
      createdAt: DateTime.now(),
    );
  }

  // Sign challenge
  Future<String> signChallenge(String challengeHex) async {
    final signature = await _ed25519.sign(
      _hexToBytes(challengeHex),
      keyPair: _keyPair!,
    );
    return _bytesToHex(signature.bytes);
  }
}
```

**Storage Location:**
- iOS: Keychain
- Android: EncryptedSharedPreferences / Keystore

---

## Backend Implementation

### Database Schema

```sql
-- Users table
ALTER TABLE users ADD COLUMN public_key VARCHAR(64) UNIQUE;
ALTER TABLE users ADD COLUMN public_key_fingerprint VARCHAR(16);
ALTER TABLE users ADD COLUMN key_registered_at TIMESTAMP;

-- Phone becomes optional (legacy/recovery)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Indexes
CREATE INDEX idx_users_public_key ON users(public_key);
CREATE INDEX idx_users_fingerprint ON users(public_key_fingerprint);
```

### Auth Endpoints

```typescript
// POST /api/auth/challenge
router.post('/challenge', async (req, res) => {
  const { publicKey } = req.body;

  // Validate: 64 hex characters
  if (!/^[a-f0-9]{64}$/i.test(publicKey)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid public key');
  }

  // Generate challenge
  const challenge = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store in Redis
  await redis.setEx(`challenge:${publicKey}`, 300, JSON.stringify({
    challenge,
    expiresAt
  }));

  return { challenge, expiresAt };
});

// POST /api/auth/verify-signature
router.post('/verify-signature', async (req, res) => {
  const { publicKey, signature } = req.body;

  // Get stored challenge
  const stored = await redis.get(`challenge:${publicKey}`);
  if (!stored) {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Challenge expired');
  }

  const { challenge } = JSON.parse(stored);

  // Verify Ed25519 signature (using tweetnacl)
  const isValid = nacl.sign.detached.verify(
    Buffer.from(challenge, 'hex'),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );

  if (!isValid) {
    throw new AppError(ErrorCode.INVALID_TOKEN, 'Invalid signature');
  }

  // Clear challenge (single-use)
  await redis.del(`challenge:${publicKey}`);

  // Get or create user
  let user = await findUserByPublicKey(publicKey);
  if (!user) {
    user = await createUserWithPublicKey(publicKey);
  }

  // Issue JWT
  const token = jwt.sign({
    id: user.id,
    publicKey: publicKey.substring(0, 16),  // fingerprint
  }, JWT_SECRET, { expiresIn: '7d' });

  return { token, user };
});
```

---

## Security Considerations

### Cryptographic Security

| Property | Guarantee |
|----------|-----------|
| Key Generation | Cryptographically secure RNG (crypto.getRandomValues) |
| Signature Algorithm | Ed25519 (128-bit security level) |
| Challenge | 256-bit random, single-use, 5-minute expiry |
| Key Storage | Platform secure storage (Keychain/Keystore/IndexedDB) |

### Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| Replay attack | Single-use challenges, timestamp validation |
| Man-in-the-middle | HTTPS, signature verification |
| Key extraction | Platform secure storage, no plaintext transmission |
| Brute force | Ed25519 256-bit keyspace, no rate-limit bypass |
| Session hijack | JWT with short expiry, device binding possible |

### Best Practices

1. **Never transmit private key** - Only signatures are sent
2. **Backup reminder** - Prompt users to backup after first login
3. **Key rotation** - Future: support for key rotation while maintaining identity
4. **Multi-device** - Import backup key on new devices

---

## Comparison: Phone OTP vs Keypair

| Aspect | Phone OTP | Keypair Auth |
|--------|-----------|--------------|
| Privacy | Phone number collected | No PII required |
| Security | SMS interception risk | Cryptographic proof |
| Cost | SMS fees | Free |
| Availability | Requires mobile network | Works offline |
| Recovery | Request new OTP | Backup key required |
| User Experience | Wait for SMS | Instant login |
| Alignment | Centralized identity | Self-sovereign identity |

---

## Future Enhancements

1. **Mnemonic Backup**
   - BIP39 word list for easier backup
   - 12-24 words instead of 64-char hex

2. **Hardware Key Support**
   - YubiKey / hardware security keys
   - Biometric-protected keys on mobile

3. **Key Rotation**
   - Rotate keypair while maintaining account
   - Old key signs authorization for new key

4. **Multi-Device Sync**
   - Encrypted key sync across devices
   - QR code key transfer

---

*Last updated: 2026-02*
