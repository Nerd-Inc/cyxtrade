import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/p2p_service.dart';
import '../services/secure_chat_service.dart';
import '../services/api_service.dart';

/// P2P Provider - Manages P2P networking state
///
/// Handles:
/// - P2P initialization and lifecycle
/// - Connection status tracking
/// - Bootstrap server registration
/// - Incoming P2P message handling
class P2PProvider extends ChangeNotifier {
  final P2PService _p2p = P2PService();
  final SecureChatService _chat = SecureChatService();
  final ApiService _api = ApiService();

  // Configuration
  static const String _defaultBootstrap = 'api.cyxtrade.com:8443';

  // State
  bool _isInitializing = false;
  bool _isInitialized = false;
  String? _error;
  Timer? _heartbeatTimer;
  Timer? _pendingMessagesTimer;

  // Getters
  bool get isInitializing => _isInitializing;
  bool get isInitialized => _isInitialized;
  bool get isConnected => _p2p.status == P2PConnectionStatus.connected;
  bool get isRelayed => _p2p.status == P2PConnectionStatus.relayed;
  P2PConnectionStatus get status => _p2p.status;
  int get peerCount => _p2p.peerCount;
  int get hopCount => _p2p.hopCount;
  String? get nodeIdHex => _p2p.localIdHex;
  Uint8List? get nodeId => _p2p.localId;
  String? get error => _error;

  // Chat service for direct access
  SecureChatService get chatService => _chat;

  /// Initialize P2P networking
  Future<void> initialize({
    String? bootstrapAddress,
    Uint8List? nodeId,
  }) async {
    if (_isInitialized || _isInitializing) return;

    _isInitializing = true;
    _error = null;
    notifyListeners();

    try {
      final bootstrap = bootstrapAddress ?? _defaultBootstrap;
      debugPrint('P2P: Initializing with bootstrap: $bootstrap');

      // Initialize P2P service
      await _p2p.initialize(
        bootstrapAddress: bootstrap,
        nodeId: nodeId,
      );

      // Initialize secure chat with P2P
      await _chat.initializeP2P(
        bootstrapAddress: bootstrap,
        nodeId: _p2p.localId,
      );

      // Set up P2P message callback
      _chat.onP2PMessageReceived = _handleP2PMessage;

      // Set status change callback
      _p2p.onStatusChanged = (status) {
        debugPrint('P2P: Status changed to $status');
        notifyListeners();
      };

      _isInitialized = true;
      debugPrint('P2P: Initialized successfully');

      // Register with bootstrap server
      await _registerWithBootstrap();

      // Start heartbeat timer
      _startHeartbeat();

      // Start checking for pending messages
      _startPendingMessagesCheck();

      notifyListeners();
    } catch (e) {
      _error = 'Failed to initialize P2P: $e';
      debugPrint('P2P: $_error');
      notifyListeners();
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  /// Register node ID with bootstrap server
  Future<void> _registerWithBootstrap() async {
    if (_p2p.localIdHex == null) return;

    try {
      final onionPubkey = _p2p.getOnionPubkey();
      await _api.registerP2PNode(
        nodeId: _p2p.localIdHex!,
        onionPubkey: onionPubkey != null
            ? onionPubkey.map((b) => b.toRadixString(16).padLeft(2, '0')).join()
            : null,
      );
      debugPrint('P2P: Registered with bootstrap server');
    } catch (e) {
      debugPrint('P2P: Failed to register with bootstrap: $e');
    }
  }

  /// Start heartbeat timer
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(
      const Duration(minutes: 2),
      (_) => _sendHeartbeat(),
    );
  }

  /// Send heartbeat to bootstrap server
  Future<void> _sendHeartbeat() async {
    try {
      await _api.sendP2PHeartbeat();
    } catch (e) {
      debugPrint('P2P: Heartbeat failed: $e');
    }
  }

  /// Start checking for pending relay messages
  void _startPendingMessagesCheck() {
    _pendingMessagesTimer?.cancel();
    _pendingMessagesTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _checkPendingMessages(),
    );
    // Also check immediately
    _checkPendingMessages();
  }

  /// Check for pending messages from relay
  Future<void> _checkPendingMessages() async {
    try {
      final response = await _api.getPendingRelayMessages();
      final messages = response['messages'] as List<dynamic>? ?? [];

      for (final msg in messages) {
        final messageData = msg as Map<String, dynamic>;
        await _processRelayMessage(messageData);

        // Acknowledge delivery
        final messageId = messageData['id'] as String?;
        if (messageId != null) {
          await _api.acknowledgeRelayMessage(messageId);
        }
      }
    } catch (e) {
      debugPrint('P2P: Failed to check pending messages: $e');
    }
  }

  /// Process a relay message
  Future<void> _processRelayMessage(Map<String, dynamic> message) async {
    try {
      final tradeId = message['tradeId'] as String;
      final encrypted = message['encrypted'] as Map<String, dynamic>;
      final senderId = message['senderId'] as String;

      // Create message for decryption
      final rawMessage = {
        'id': message['id'],
        'tradeId': tradeId,
        'senderId': senderId,
        'messageType': 'text',
        'encrypted': encrypted,
        'createdAt': message['createdAt'],
        'viaP2P': false,
        'viaRelay': true,
      };

      // Decrypt and notify
      final decrypted = await _chat.decryptMessage(rawMessage, 'me');
      final relayMessage = DecryptedMessage(
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
        deliveryMethod: DeliveryMethod.offline,
      );

      _chat.onP2PMessageReceived?.call(relayMessage);
    } catch (e) {
      debugPrint('P2P: Failed to process relay message: $e');
    }
  }

  /// Handle incoming P2P message
  void _handleP2PMessage(DecryptedMessage message) {
    debugPrint('P2P: Received message via ${message.deliveryMethod.name}');
    // Messages are already forwarded via onP2PMessageReceived callback
    notifyListeners();
  }

  /// Set onion routing hop count
  void setHopCount(int hops) {
    _chat.setOnionHops(hops);
    notifyListeners();
  }

  /// Enable/disable onion routing
  void setOnionRouting(bool enabled) {
    _chat.setUseOnionRouting(enabled);
    notifyListeners();
  }

  /// Get counterparty's P2P info for a trade
  Future<Map<String, dynamic>?> getCounterpartyP2PInfo(String counterpartyId) async {
    try {
      return await _api.getP2PPeerInfo(counterpartyId);
    } catch (e) {
      debugPrint('P2P: Failed to get peer info: $e');
      return null;
    }
  }

  /// Register counterparty for P2P messaging
  Future<void> registerCounterparty(
    String tradeId,
    String counterpartyId,
  ) async {
    try {
      final peerInfo = await getCounterpartyP2PInfo(counterpartyId);
      if (peerInfo == null) {
        debugPrint('P2P: Counterparty not registered for P2P');
        return;
      }

      final nodeIdHex = peerInfo['nodeId'] as String?;
      final onionPubkeyHex = peerInfo['onionPubkey'] as String?;

      if (nodeIdHex == null) return;

      // Convert hex to bytes
      final nodeId = _hexToBytes(nodeIdHex);

      // Register node ID
      _chat.registerCounterpartyNodeId(tradeId, counterpartyId, nodeId);

      // Register onion key if available
      if (onionPubkeyHex != null) {
        final onionPubkey = _hexToBytes(onionPubkeyHex);
        _chat.registerCounterpartyOnionKey(counterpartyId, nodeId, onionPubkey);
      }

      debugPrint('P2P: Registered counterparty $counterpartyId for trade $tradeId');
    } catch (e) {
      debugPrint('P2P: Failed to register counterparty: $e');
    }
  }

  /// Convert hex string to bytes
  Uint8List _hexToBytes(String hex) {
    final result = Uint8List(hex.length ~/ 2);
    for (int i = 0; i < result.length; i++) {
      result[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
    }
    return result;
  }

  /// Shutdown P2P networking
  Future<void> shutdown() async {
    _heartbeatTimer?.cancel();
    _pendingMessagesTimer?.cancel();

    try {
      await _api.unregisterP2PNode();
    } catch (e) {
      debugPrint('P2P: Failed to unregister: $e');
    }

    await _chat.shutdownP2P();
    await _p2p.shutdown();

    _isInitialized = false;
    notifyListeners();

    debugPrint('P2P: Shutdown complete');
  }

  @override
  void dispose() {
    shutdown();
    super.dispose();
  }
}
