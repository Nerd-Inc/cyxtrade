// CyxTrade E2E Encryption Service
//
// Implements end-to-end encryption using:
// - X25519 for key exchange (Curve25519 ECDH)
// - ChaCha20-Poly1305 for authenticated encryption
//
// Based on CyxWiz protocol primitives.

import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Key sizes
const int keySize = 32;
const int nonceSize = 12; // ChaCha20-Poly1305 uses 12-byte nonce
const int authTagSize = 16;

/// Encrypted message format
class EncryptedMessage {
  final String nonce;
  final String ciphertext;
  final String? ephemeralPubKey;

  EncryptedMessage({
    required this.nonce,
    required this.ciphertext,
    this.ephemeralPubKey,
  });

  Map<String, dynamic> toJson() => {
        'nonce': nonce,
        'ciphertext': ciphertext,
        if (ephemeralPubKey != null) 'ephemeralPubKey': ephemeralPubKey,
      };

  factory EncryptedMessage.fromJson(Map<String, dynamic> json) {
    return EncryptedMessage(
      nonce: json['nonce'] as String,
      ciphertext: json['ciphertext'] as String,
      ephemeralPubKey: json['ephemeralPubKey'] as String?,
    );
  }

  /// Check if this is an encrypted message (has required fields)
  static bool isEncrypted(Map<String, dynamic>? json) {
    if (json == null) return false;
    return json.containsKey('nonce') && json.containsKey('ciphertext');
  }
}

/// E2E Encryption Service
class CryptoService {
  static final CryptoService _instance = CryptoService._internal();
  factory CryptoService() => _instance;
  CryptoService._internal();

  final _storage = const FlutterSecureStorage();
  final _x25519 = X25519();
  final _chacha = Chacha20.poly1305Aead();

  // Cached key pair
  SimpleKeyPair? _keyPair;
  List<int>? _publicKeyBytes;

  // Shared secrets cache (userId -> shared secret)
  final Map<String, SecretKey> _sharedSecrets = {};

  // Trade-specific keys cache (tradeId -> key pair)
  final Map<String, SimpleKeyPair> _tradeKeys = {};

  /// Initialize the crypto service
  /// Loads or generates the user's key pair
  Future<void> initialize() async {
    // Try to load existing key pair
    final savedSecretKey = await _storage.read(key: 'crypto_secret_key');

    if (savedSecretKey != null) {
      // Restore from saved key
      final secretKeyBytes = base64Decode(savedSecretKey);
      final secretKey = SimpleKeyPairData(
        secretKeyBytes,
        publicKey: SimplePublicKey(
          await _derivePublicKey(secretKeyBytes),
          type: KeyPairType.x25519,
        ),
        type: KeyPairType.x25519,
      );
      _keyPair = secretKey;
      _publicKeyBytes = (await _keyPair!.extractPublicKey()).bytes.toList();
    } else {
      // Generate new key pair
      await _generateKeyPair();
    }
  }

  /// Generate a new X25519 key pair
  Future<void> _generateKeyPair() async {
    _keyPair = await _x25519.newKeyPair();
    _publicKeyBytes = (await _keyPair!.extractPublicKey()).bytes.toList();

    // Save secret key securely
    final secretKeyData = await _keyPair!.extract();
    await _storage.write(
      key: 'crypto_secret_key',
      value: base64Encode(secretKeyData.bytes),
    );

    print('🔐 Generated new X25519 key pair');
  }

  /// Derive public key from secret key bytes
  Future<List<int>> _derivePublicKey(List<int> secretKeyBytes) async {
    // Create a temporary key pair to derive public key
    final keyPair = await _x25519.newKeyPairFromSeed(secretKeyBytes);
    return (await keyPair.extractPublicKey()).bytes.toList();
  }

  /// Get the user's public key (Base64 encoded)
  Future<String> getPublicKey() async {
    if (_publicKeyBytes == null) {
      await initialize();
    }
    return base64Encode(_publicKeyBytes!);
  }

  /// Get public key as bytes
  Future<List<int>> getPublicKeyBytes() async {
    if (_publicKeyBytes == null) {
      await initialize();
    }
    return _publicKeyBytes!;
  }

  /// Compute shared secret with another user
  Future<SecretKey> computeSharedSecret(String theirPublicKeyBase64) async {
    if (_keyPair == null) {
      await initialize();
    }

    final theirPublicKey = SimplePublicKey(
      base64Decode(theirPublicKeyBase64),
      type: KeyPairType.x25519,
    );

    return await _x25519.sharedSecretKey(
      keyPair: _keyPair!,
      remotePublicKey: theirPublicKey,
    );
  }

  /// Get or compute shared secret (with caching)
  Future<SecretKey> getSharedSecret(String recipientId, String theirPublicKeyBase64) async {
    if (_sharedSecrets.containsKey(recipientId)) {
      return _sharedSecrets[recipientId]!;
    }

    final sharedSecret = await computeSharedSecret(theirPublicKeyBase64);
    _sharedSecrets[recipientId] = sharedSecret;
    return sharedSecret;
  }

  /// Clear cached shared secret (e.g., when user rotates key)
  void clearSharedSecret(String recipientId) {
    _sharedSecrets.remove(recipientId);
  }

  /// Encrypt a message using shared secret
  Future<EncryptedMessage> encryptWithSharedSecret(
    String plaintext,
    SecretKey sharedSecret,
  ) async {
    final plaintextBytes = utf8.encode(plaintext);
    final nonce = _chacha.newNonce();

    final secretBox = await _chacha.encrypt(
      plaintextBytes,
      secretKey: sharedSecret,
      nonce: nonce,
    );

    // Combine ciphertext and MAC
    final ciphertextWithMac = Uint8List.fromList([
      ...secretBox.cipherText,
      ...secretBox.mac.bytes,
    ]);

    return EncryptedMessage(
      nonce: base64Encode(nonce),
      ciphertext: base64Encode(ciphertextWithMac),
    );
  }

  /// Decrypt a message using shared secret
  Future<String?> decryptWithSharedSecret(
    EncryptedMessage encrypted,
    SecretKey sharedSecret,
  ) async {
    try {
      final nonce = base64Decode(encrypted.nonce);
      final ciphertextWithMac = base64Decode(encrypted.ciphertext);

      // Split ciphertext and MAC
      final ciphertext = ciphertextWithMac.sublist(0, ciphertextWithMac.length - authTagSize);
      final mac = Mac(ciphertextWithMac.sublist(ciphertextWithMac.length - authTagSize));

      final secretBox = SecretBox(
        ciphertext,
        nonce: nonce,
        mac: mac,
      );

      final plaintext = await _chacha.decrypt(
        secretBox,
        secretKey: sharedSecret,
      );

      return utf8.decode(plaintext);
    } catch (e) {
      print('❌ Decryption failed: $e');
      return null;
    }
  }

  /// Encrypt a message for a recipient (using cached shared secret)
  Future<EncryptedMessage> encrypt(
    String plaintext,
    String recipientId,
    String recipientPublicKey,
  ) async {
    final sharedSecret = await getSharedSecret(recipientId, recipientPublicKey);
    return encryptWithSharedSecret(plaintext, sharedSecret);
  }

  /// Decrypt a message from a sender
  Future<String?> decrypt(
    EncryptedMessage encrypted,
    String senderId,
    String senderPublicKey,
  ) async {
    final sharedSecret = await getSharedSecret(senderId, senderPublicKey);
    return decryptWithSharedSecret(encrypted, sharedSecret);
  }

  /// Generate ephemeral key pair for a specific trade
  Future<SimpleKeyPair> generateTradeKeyPair(String tradeId) async {
    final keyPair = await _x25519.newKeyPair();
    _tradeKeys[tradeId] = keyPair;
    return keyPair;
  }

  /// Get trade key pair (or generate if not exists)
  Future<SimpleKeyPair> getTradeKeyPair(String tradeId) async {
    if (_tradeKeys.containsKey(tradeId)) {
      return _tradeKeys[tradeId]!;
    }
    return generateTradeKeyPair(tradeId);
  }

  /// Get trade public key (Base64)
  Future<String> getTradePublicKey(String tradeId) async {
    final keyPair = await getTradeKeyPair(tradeId);
    final publicKey = await keyPair.extractPublicKey();
    return base64Encode(publicKey.bytes);
  }

  /// Encrypt for trade (using trade-specific keys)
  Future<EncryptedMessage> encryptForTrade(
    String plaintext,
    String tradeId,
    String recipientTradePublicKey,
  ) async {
    final keyPair = await getTradeKeyPair(tradeId);
    final theirPublicKey = SimplePublicKey(
      base64Decode(recipientTradePublicKey),
      type: KeyPairType.x25519,
    );

    final sharedSecret = await _x25519.sharedSecretKey(
      keyPair: keyPair,
      remotePublicKey: theirPublicKey,
    );

    return encryptWithSharedSecret(plaintext, sharedSecret);
  }

  /// Decrypt from trade
  Future<String?> decryptFromTrade(
    EncryptedMessage encrypted,
    String tradeId,
    String senderTradePublicKey,
  ) async {
    final keyPair = await getTradeKeyPair(tradeId);
    final theirPublicKey = SimplePublicKey(
      base64Decode(senderTradePublicKey),
      type: KeyPairType.x25519,
    );

    final sharedSecret = await _x25519.sharedSecretKey(
      keyPair: keyPair,
      remotePublicKey: theirPublicKey,
    );

    return decryptWithSharedSecret(encrypted, sharedSecret);
  }

  /// Rotate main key pair (for security)
  Future<void> rotateKeyPair() async {
    // Clear old shared secrets
    _sharedSecrets.clear();
    _tradeKeys.clear();

    // Generate new key pair
    await _generateKeyPair();

    print('🔄 Key pair rotated');
  }

  /// Clear all cryptographic material
  Future<void> clear() async {
    _keyPair = null;
    _publicKeyBytes = null;
    _sharedSecrets.clear();
    _tradeKeys.clear();
    await _storage.delete(key: 'crypto_secret_key');
  }

  /// Check if crypto is initialized
  bool get isInitialized => _keyPair != null;

  /// Generate random bytes
  List<int> randomBytes(int length) {
    final algorithm = AesGcm.with256bits();
    return algorithm.newNonce();
  }
}
