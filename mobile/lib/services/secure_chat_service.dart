// Secure Chat Service - E2E Encrypted Messaging with P2P
//
// Handles:
// - Key exchange with trade counterparty
// - Message encryption before sending
// - Message decryption on receive
// - P2P delivery via onion routing (anonymous)
// - Fallback to backend relay when P2P unavailable
// - Key caching for performance

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'crypto_service.dart';
import 'p2p_service.dart';

// Delivery method for messages
enum DeliveryMethod {
  unknown,
  p2pDirect,    // Direct P2P (no onion routing)
  p2pOnion,     // P2P with onion routing (anonymous)
  relay,        // Via backend relay
  offline,      // Queued for offline delivery
}

/// Decrypted message for display
class DecryptedMessage {
  final String id;
  final String tradeId;
  final String senderId;
  final String messageType;
  final String? content;           // Decrypted content
  final String? imageUrl;
  final String createdAt;
  final String? readAt;
  final bool isEncrypted;          // Was this an encrypted message?
  final bool decryptionFailed;     // Failed to decrypt
  final DeliveryMethod deliveryMethod;  // How was it delivered?
  final int? onionHops;            // Number of onion hops (if P2P)

  DecryptedMessage({
    required this.id,
    required this.tradeId,
    required this.senderId,
    required this.messageType,
    this.content,
    this.imageUrl,
    required this.createdAt,
    this.readAt,
    this.isEncrypted = false,
    this.decryptionFailed = false,
    this.deliveryMethod = DeliveryMethod.unknown,
    this.onionHops,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'tradeId': tradeId,
        'senderId': senderId,
        'messageType': messageType,
        'content': content,
        'imageUrl': imageUrl,
        'createdAt': createdAt,
        'readAt': readAt,
        'isEncrypted': isEncrypted,
        'decryptionFailed': decryptionFailed,
        'deliveryMethod': deliveryMethod.name,
        'onionHops': onionHops,
      };
}

/// Secure Chat Service with P2P support
class SecureChatService {
  static final SecureChatService _instance = SecureChatService._internal();
  factory SecureChatService() => _instance;
  SecureChatService._internal();

  final _api = ApiService();
  final _crypto = CryptoService();
  final _p2p = P2PService();

  // Cache of counterparty public keys per trade
  final Map<String, Map<String, String>> _tradeKeys = {};

  // Cache of counterparty P2P node IDs per trade
  final Map<String, Map<String, Uint8List>> _tradeNodeIds = {};

  // Track if we've registered our key for a trade
  final Set<String> _registeredTrades = {};

  // P2P enabled flag
  bool _p2pEnabled = false;

  // Use onion routing for P2P messages
  bool _useOnionRouting = true;

  // Callback for P2P messages
  void Function(DecryptedMessage)? onP2PMessageReceived;

  // Getters
  bool get p2pEnabled => _p2pEnabled;
  bool get useOnionRouting => _useOnionRouting;
  P2PConnectionStatus get p2pStatus => _p2p.status;
  int get p2pPeerCount => _p2p.peerCount;
  int get onionHops => _p2p.hopCount;

  /// Initialize P2P networking
  Future<void> initializeP2P({
    required String bootstrapAddress,
    Uint8List? nodeId,
  }) async {
    try {
      await _p2p.initialize(
        bootstrapAddress: bootstrapAddress,
        nodeId: nodeId,
      );

      // Set up message callback
      _p2p.onMessageReceived = _handleP2PMessage;

      _p2pEnabled = true;
      debugPrint('P2P initialized for secure chat');
    } catch (e) {
      debugPrint('Failed to initialize P2P: $e');
      _p2pEnabled = false;
    }
  }

  /// Set onion routing preference
  void setUseOnionRouting(bool enabled) {
    _useOnionRouting = enabled;
    debugPrint('Onion routing ${enabled ? 'enabled' : 'disabled'}');
  }

  /// Set onion hop count (1-8)
  void setOnionHops(int hops) {
    _p2p.setHopCount(hops);
  }

  /// Get local P2P node ID
  Uint8List? get localNodeId => _p2p.localId;

  /// Get local P2P node ID as hex
  String? get localNodeIdHex => _p2p.localIdHex;

  /// Initialize secure chat for a trade
  /// Call this when entering a trade chat
  Future<void> initializeForTrade(String tradeId, String counterpartyId) async {
    try {
      // Ensure crypto is initialized
      if (!_crypto.isInitialized) {
        await _crypto.initialize();
      }

      // Register our trade key if not already done
      if (!_registeredTrades.contains(tradeId)) {
        final myTradeKey = await _crypto.getTradePublicKey(tradeId);
        await _api.registerTradeKey(tradeId, myTradeKey);
        _registeredTrades.add(tradeId);
        debugPrint('Registered trade key for $tradeId');
      }

      // Fetch counterparty's trade key
      await _fetchTradeKeys(tradeId);

      debugPrint('Secure chat initialized for trade $tradeId');
    } catch (e) {
      debugPrint('Failed to initialize secure chat: $e');
      rethrow;
    }
  }

  /// Fetch and cache trade keys
  Future<void> _fetchTradeKeys(String tradeId) async {
    try {
      final response = await _api.getTradeKeys(tradeId);
      final keys = response['keys'] as Map<String, dynamic>?;

      if (keys != null) {
        _tradeKeys[tradeId] = {};
        for (final entry in keys.entries) {
          final keyData = entry.value as Map<String, dynamic>;
          _tradeKeys[tradeId]![entry.key] = keyData['publicKey'] as String;
        }
        debugPrint('Fetched ${keys.length} trade keys for $tradeId');
      }
    } catch (e) {
      debugPrint('Failed to fetch trade keys: $e');
    }
  }

  /// Get counterparty's public key for a trade
  String? getCounterpartyKey(String tradeId, String counterpartyId) {
    return _tradeKeys[tradeId]?[counterpartyId];
  }

  /// Encrypt and send a message (tries P2P first, falls back to API)
  Future<Map<String, dynamic>> sendMessage(
    String tradeId,
    String plaintext,
    String counterpartyId,
  ) async {
    // Get counterparty's trade key
    var theirKey = getCounterpartyKey(tradeId, counterpartyId);

    // Try to refresh keys if not found
    if (theirKey == null) {
      await _fetchTradeKeys(tradeId);
      theirKey = getCounterpartyKey(tradeId, counterpartyId);
    }

    if (theirKey == null) {
      // Fallback: try to get their main public key
      try {
        final keyResponse = await _api.getUserPublicKey(counterpartyId);
        theirKey = keyResponse['publicKey'] as String?;
      } catch (e) {
        debugPrint('Failed to get counterparty key: $e');
      }
    }

    if (theirKey == null) {
      throw Exception('Cannot encrypt: counterparty key not found');
    }

    // Encrypt the message
    final encrypted = await _crypto.encryptForTrade(
      plaintext,
      tradeId,
      theirKey,
    );

    // Try P2P delivery first
    if (_p2pEnabled && _p2p.status == P2PConnectionStatus.connected) {
      final sent = await _tryP2PSend(tradeId, counterpartyId, encrypted);
      if (sent) {
        return {
          'id': DateTime.now().millisecondsSinceEpoch.toString(),
          'tradeId': tradeId,
          'senderId': 'me',
          'messageType': 'text',
          'encrypted': encrypted.toJson(),
          'createdAt': DateTime.now().toIso8601String(),
          'deliveryMethod': _useOnionRouting ? 'p2pOnion' : 'p2pDirect',
          'onionHops': _useOnionRouting ? _p2p.hopCount : null,
        };
      }
    }

    // Fallback to API relay
    debugPrint('Falling back to API relay');
    final response = await _api.sendEncryptedMessage(
      tradeId,
      encrypted.toJson(),
    );

    // Mark as relay delivery
    response['deliveryMethod'] = 'relay';
    return response;
  }

  /// Try to send message via P2P
  Future<bool> _tryP2PSend(
    String tradeId,
    String counterpartyId,
    EncryptedMessage encrypted,
  ) async {
    try {
      // Get counterparty's P2P node ID
      final nodeId = _tradeNodeIds[tradeId]?[counterpartyId];
      if (nodeId == null) {
        debugPrint('No P2P node ID for counterparty');
        return false;
      }

      // Serialize message for P2P transport
      final messageData = _serializeP2PMessage(tradeId, encrypted);

      // Send via P2P
      if (_useOnionRouting) {
        await _p2p.sendAnonymous(nodeId, messageData);
        debugPrint('Sent via onion routing (${_p2p.hopCount} hops)');
      } else {
        await _p2p.send(nodeId, messageData);
        debugPrint('Sent via direct P2P');
      }

      return true;
    } catch (e) {
      debugPrint('P2P send failed: $e');
      return false;
    }
  }

  /// Serialize message for P2P transport
  Uint8List _serializeP2PMessage(String tradeId, EncryptedMessage encrypted) {
    final json = jsonEncode({
      'type': 'chat',
      'tradeId': tradeId,
      'encrypted': encrypted.toJson(),
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    return Uint8List.fromList(utf8.encode(json));
  }

  /// Handle incoming P2P message
  void _handleP2PMessage(P2PMessage message) {
    try {
      // Deserialize message
      final jsonStr = utf8.decode(message.data);
      final data = jsonDecode(jsonStr) as Map<String, dynamic>;

      if (data['type'] != 'chat') return;

      final tradeId = data['tradeId'] as String;
      final encryptedData = data['encrypted'] as Map<String, dynamic>;

      // Create message for decryption
      final rawMessage = {
        'id': 'p2p-${DateTime.now().millisecondsSinceEpoch}',
        'tradeId': tradeId,
        'senderId': _bytesToHex(message.senderId),
        'messageType': 'text',
        'encrypted': encryptedData,
        'createdAt': DateTime.now().toIso8601String(),
        'viaP2P': true,
        'viaOnion': message.viaOnion,
      };

      // Decrypt and notify (async)
      _decryptAndNotify(rawMessage, message.viaOnion);
    } catch (e) {
      debugPrint('Failed to handle P2P message: $e');
    }
  }

  /// Decrypt P2P message and notify callback
  Future<void> _decryptAndNotify(
    Map<String, dynamic> message,
    bool viaOnion,
  ) async {
    try {
      final decrypted = await decryptMessage(message, 'me');
      // Create a new message with delivery info
      final p2pMessage = DecryptedMessage(
        id: decrypted.id,
        tradeId: decrypted.tradeId,
        senderId: decrypted.senderId,
        messageType: decrypted.messageType,
        content: decrypted.content,
        imageUrl: decrypted.imageUrl,
        createdAt: decrypted.createdAt,
        readAt: decrypted.readAt,
        isEncrypted: decrypted.isEncrypted,
        decryptionFailed: decrypted.decryptionFailed,
        deliveryMethod: viaOnion ? DeliveryMethod.p2pOnion : DeliveryMethod.p2pDirect,
        onionHops: viaOnion ? _p2p.hopCount : null,
      );
      onP2PMessageReceived?.call(p2pMessage);
    } catch (e) {
      debugPrint('Failed to decrypt P2P message: $e');
    }
  }

  /// Register counterparty's P2P node ID for a trade
  void registerCounterpartyNodeId(
    String tradeId,
    String counterpartyId,
    Uint8List nodeId,
  ) {
    _tradeNodeIds[tradeId] ??= {};
    _tradeNodeIds[tradeId]![counterpartyId] = nodeId;
    debugPrint('Registered P2P node ID for $counterpartyId in trade $tradeId');
  }

  /// Add counterparty's onion public key
  void registerCounterpartyOnionKey(
    String counterpartyId,
    Uint8List nodeId,
    Uint8List pubkey,
  ) {
    _p2p.addPeerOnionKey(nodeId, pubkey);
    debugPrint('Registered onion key for $counterpartyId');
  }

  // Utility: bytes to hex
  String _bytesToHex(Uint8List bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  /// Decrypt a received message
  Future<DecryptedMessage> decryptMessage(
    Map<String, dynamic> message,
    String myUserId,
  ) async {
    final id = message['id'] as String? ?? '';
    final tradeId = message['tradeId'] as String? ?? '';
    final senderId = message['senderId'] as String? ?? '';
    final messageType = message['messageType'] as String? ?? 'text';
    final createdAt = message['createdAt'] as String? ?? '';
    final readAt = message['readAt'] as String?;
    final imageUrl = message['imageUrl'] as String?;

    // Check if message is encrypted
    final encrypted = message['encrypted'];
    if (encrypted == null || encrypted is! Map<String, dynamic>) {
      // Not encrypted (system message or legacy)
      return DecryptedMessage(
        id: id,
        tradeId: tradeId,
        senderId: senderId,
        messageType: messageType,
        content: message['content'] as String?,
        imageUrl: imageUrl,
        createdAt: createdAt,
        readAt: readAt,
        isEncrypted: false,
      );
    }

    // Message is encrypted - try to decrypt
    try {
      // Parse encrypted payload
      final encryptedMsg = EncryptedMessage.fromJson(encrypted);

      // Get sender's trade key
      var senderKey = getCounterpartyKey(tradeId, senderId);

      if (senderKey == null) {
        await _fetchTradeKeys(tradeId);
        senderKey = getCounterpartyKey(tradeId, senderId);
      }

      if (senderKey == null) {
        // Try main public key
        try {
          final keyResponse = await _api.getUserPublicKey(senderId);
          senderKey = keyResponse['publicKey'] as String?;
        } catch (e) {
          debugPrint('Failed to get sender key: $e');
        }
      }

      if (senderKey == null) {
        throw Exception('Sender key not found');
      }

      // Decrypt
      final plaintext = await _crypto.decryptFromTrade(
        encryptedMsg,
        tradeId,
        senderKey,
      );

      if (plaintext == null) {
        throw Exception('Decryption returned null');
      }

      return DecryptedMessage(
        id: id,
        tradeId: tradeId,
        senderId: senderId,
        messageType: messageType,
        content: plaintext,
        imageUrl: imageUrl,
        createdAt: createdAt,
        readAt: readAt,
        isEncrypted: true,
      );
    } catch (e) {
      debugPrint('Decryption failed: $e');
      return DecryptedMessage(
        id: id,
        tradeId: tradeId,
        senderId: senderId,
        messageType: messageType,
        content: '[Encrypted message - unable to decrypt]',
        imageUrl: imageUrl,
        createdAt: createdAt,
        readAt: readAt,
        isEncrypted: true,
        decryptionFailed: true,
      );
    }
  }

  /// Decrypt multiple messages
  Future<List<DecryptedMessage>> decryptMessages(
    List<Map<String, dynamic>> messages,
    String myUserId,
  ) async {
    final results = <DecryptedMessage>[];

    for (final message in messages) {
      final decrypted = await decryptMessage(message, myUserId);
      results.add(decrypted);
    }

    return results;
  }

  /// Load and decrypt messages for a trade
  Future<List<DecryptedMessage>> loadMessages(
    String tradeId,
    String myUserId,
    String counterpartyId,
  ) async {
    // Initialize encryption first
    await initializeForTrade(tradeId, counterpartyId);

    // Fetch messages
    final response = await _api.getChatMessages(tradeId);
    final messages = List<Map<String, dynamic>>.from(response['messages'] ?? []);

    // Decrypt all messages
    return decryptMessages(messages, myUserId);
  }

  /// Clear cached keys for a trade (call when leaving chat)
  void clearTradeKeys(String tradeId) {
    _tradeKeys.remove(tradeId);
    _tradeNodeIds.remove(tradeId);
    debugPrint('Cleared trade keys for $tradeId');
  }

  /// Clear all cached keys
  void clearAllKeys() {
    _tradeKeys.clear();
    _tradeNodeIds.clear();
    _registeredTrades.clear();
    debugPrint('Cleared all trade keys');
  }

  /// Shutdown P2P networking
  Future<void> shutdownP2P() async {
    await _p2p.shutdown();
    _p2pEnabled = false;
    debugPrint('P2P shutdown complete');
  }
}
