// CyxTrade Identity Service
//
// Implements Ed25519 keypair-based identity for anonymous authentication.
// This service manages the user's cryptographic identity.
//
// Based on CyxWiz protocol - uses the same identity system as CyxChat.

import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// User Identity (derived from Ed25519 keypair)
class Identity {
  final String publicKey; // Hex encoded (64 chars)
  final String fingerprint; // First 16 chars of public key
  final DateTime createdAt;

  Identity({
    required this.publicKey,
    required this.fingerprint,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'publicKey': publicKey,
    'fingerprint': fingerprint,
    'createdAt': createdAt.toIso8601String(),
  };

  factory Identity.fromJson(Map<String, dynamic> json) {
    return Identity(
      publicKey: json['publicKey'] as String,
      fingerprint: json['fingerprint'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

/// Identity Service for keypair-based authentication
class IdentityService {
  static final IdentityService _instance = IdentityService._internal();
  factory IdentityService() => _instance;
  IdentityService._internal();

  final _storage = const FlutterSecureStorage();
  final _ed25519 = Ed25519();

  // Cached key pair
  SimpleKeyPair? _keyPair;
  Identity? _identity;

  /// Storage keys
  static const _keyPrivate = 'identity_private_key';
  static const _keyCreatedAt = 'identity_created_at';

  /// Get or create identity
  /// If identity exists, loads it from secure storage.
  /// If not, generates a new Ed25519 keypair.
  Future<Identity> getOrCreateIdentity() async {
    // Try to load existing identity
    if (_identity != null) {
      return _identity!;
    }

    final savedPrivateKey = await _storage.read(key: _keyPrivate);
    if (savedPrivateKey != null) {
      return _loadIdentity(savedPrivateKey);
    }

    // Generate new identity
    return _generateNewIdentity();
  }

  /// Load identity from stored private key
  Future<Identity> _loadIdentity(String privateKeyHex) async {
    final privateKeyBytes = _hexToBytes(privateKeyHex);

    // Recreate keypair from seed
    _keyPair = await _ed25519.newKeyPairFromSeed(privateKeyBytes);

    // Get public key
    final publicKey = await _keyPair!.extractPublicKey();
    final publicKeyHex = _bytesToHex(publicKey.bytes);
    final fingerprint = publicKeyHex.substring(0, 16);

    // Load created at
    final createdAtStr = await _storage.read(key: _keyCreatedAt);
    final createdAt = createdAtStr != null
        ? DateTime.parse(createdAtStr)
        : DateTime.now();

    _identity = Identity(
      publicKey: publicKeyHex,
      fingerprint: fingerprint,
      createdAt: createdAt,
    );

    return _identity!;
  }

  /// Generate new Ed25519 keypair
  Future<Identity> _generateNewIdentity() async {
    _keyPair = await _ed25519.newKeyPair();

    // Extract keys
    final privateKeyData = await _keyPair!.extract();
    final publicKey = await _keyPair!.extractPublicKey();

    final privateKeyHex = _bytesToHex(privateKeyData.bytes);
    final publicKeyHex = _bytesToHex(publicKey.bytes);
    final fingerprint = publicKeyHex.substring(0, 16);
    final createdAt = DateTime.now();

    // Save private key securely
    await _storage.write(key: _keyPrivate, value: privateKeyHex);
    await _storage.write(key: _keyCreatedAt, value: createdAt.toIso8601String());

    _identity = Identity(
      publicKey: publicKeyHex,
      fingerprint: fingerprint,
      createdAt: createdAt,
    );

    print('🔐 Generated new Ed25519 identity: ${_identity!.fingerprint}');
    return _identity!;
  }

  /// Sign a challenge with the private key
  Future<String> signChallenge(String challengeHex) async {
    if (_keyPair == null) {
      await getOrCreateIdentity();
    }

    final challengeBytes = _hexToBytes(challengeHex);

    final signature = await _ed25519.sign(
      challengeBytes,
      keyPair: _keyPair!,
    );

    return _bytesToHex(signature.bytes);
  }

  /// Check if an identity exists in storage
  Future<bool> hasIdentity() async {
    final savedKey = await _storage.read(key: _keyPrivate);
    return savedKey != null;
  }

  /// Export private key as hex (for backup)
  Future<String?> exportPrivateKey() async {
    if (_keyPair == null) {
      final savedKey = await _storage.read(key: _keyPrivate);
      return savedKey;
    }

    final privateKeyData = await _keyPair!.extract();
    return _bytesToHex(privateKeyData.bytes);
  }

  /// Import identity from private key hex
  Future<Identity> importFromPrivateKey(String privateKeyHex) async {
    if (privateKeyHex.length != 64) {
      throw ArgumentError('Invalid private key format. Expected 64 hex characters.');
    }

    // Save and load
    await _storage.write(key: _keyPrivate, value: privateKeyHex.toLowerCase());
    await _storage.write(key: _keyCreatedAt, value: DateTime.now().toIso8601String());

    return _loadIdentity(privateKeyHex.toLowerCase());
  }

  /// Clear identity (logout)
  Future<void> clearIdentity() async {
    _keyPair = null;
    _identity = null;
    await _storage.delete(key: _keyPrivate);
    await _storage.delete(key: _keyCreatedAt);
  }

  /// Get current identity (null if not loaded)
  Identity? get currentIdentity => _identity;

  /// Check if identity is initialized
  bool get isInitialized => _keyPair != null;

  // === Utility functions ===

  /// Convert bytes to hex string
  String _bytesToHex(List<int> bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join('');
  }

  /// Convert hex string to bytes
  Uint8List _hexToBytes(String hex) {
    final bytes = Uint8List(hex.length ~/ 2);
    for (int i = 0; i < hex.length; i += 2) {
      bytes[i ~/ 2] = int.parse(hex.substring(i, i + 2), radix: 16);
    }
    return bytes;
  }
}
