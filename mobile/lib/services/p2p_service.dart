// P2P Service - High-level wrapper for CyxWiz P2P networking
//
// Manages:
// - Transport (UDP with NAT traversal)
// - Peer discovery (local + DHT)
// - Mesh routing
// - Onion routing for anonymous messaging
// - Background polling via isolate

import 'dart:async';
import 'dart:ffi';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';

import '../ffi/cyxwiz_bindings.dart';
import 'p2p_isolate.dart';

// Connection status enum
enum P2PConnectionStatus {
  disconnected,
  connecting,
  connected,
  relayed, // Connected via relay (NAT punch failed)
}

// Peer info
class PeerInfo {
  final Uint8List nodeId;
  final String? address;
  final int? latencyMs;
  final DateTime lastSeen;
  final bool isRelay;

  PeerInfo({
    required this.nodeId,
    this.address,
    this.latencyMs,
    required this.lastSeen,
    this.isRelay = false,
  });

  String get nodeIdHex => nodeId.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

  String get shortId => nodeIdHex.substring(0, 8);
}

// Received message
class P2PMessage {
  final Uint8List senderId;
  final Uint8List data;
  final DateTime receivedAt;
  final bool viaOnion;

  P2PMessage({
    required this.senderId,
    required this.data,
    required this.receivedAt,
    this.viaOnion = false,
  });
}

// P2P Service
class P2PService {
  static P2PService? _instance;
  factory P2PService() {
    _instance ??= P2PService._();
    return _instance!;
  }
  P2PService._();

  // Native library
  CyxwizNative? _native;

  // Native context pointers
  Pointer<Void>? _transport;
  Pointer<Void>? _peerTable;
  Pointer<Void>? _router;
  Pointer<Void>? _dht;
  Pointer<Void>? _onion;
  Pointer<Void>? _discovery;

  // Local node ID
  Uint8List? _localId;

  // Bootstrap server address
  String? _bootstrapAddress;

  // Status
  P2PConnectionStatus _status = P2PConnectionStatus.disconnected;
  bool _isInitialized = false;

  // Background isolate
  Isolate? _pollIsolate;
  ReceivePort? _receivePort;
  SendPort? _sendPort;

  // Callbacks
  void Function(P2PMessage)? onMessageReceived;
  void Function(PeerInfo)? onPeerDiscovered;
  void Function(PeerInfo)? onPeerDisconnected;
  void Function(P2PConnectionStatus)? onStatusChanged;

  // Onion hop count (1-8)
  int _hopCount = 3;

  // Getters
  bool get isInitialized => _isInitialized;
  P2PConnectionStatus get status => _status;
  Uint8List? get localId => _localId;
  String? get localIdHex =>
      _localId?.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  int get hopCount => _hopCount;

  // Initialize P2P networking
  Future<void> initialize({
    required String bootstrapAddress,
    Uint8List? nodeId,
  }) async {
    if (_isInitialized) {
      debugPrint('P2P: Already initialized');
      return;
    }

    debugPrint('P2P: Initializing...');
    _bootstrapAddress = bootstrapAddress;

    try {
      // Load native library
      _native = CyxwizNative();
      _native!.initialize();

      // Generate or use provided node ID
      _localId = nodeId ?? _native!.generateNodeId();
      debugPrint('P2P: Local ID = ${localIdHex?.substring(0, 16)}...');

      // Create transport
      _transport = _native!.createTransport(bootstrapAddress);
      debugPrint('P2P: Transport created (bootstrap: $bootstrapAddress)');

      // Create peer table
      _peerTable = _native!.createPeerTable();
      debugPrint('P2P: Peer table created');

      // Create router
      _router = _native!.createRouter(_peerTable!, _transport!, _localId!);
      debugPrint('P2P: Router created');

      // Create DHT
      _dht = _native!.createDht(_router!, _localId!);
      debugPrint('P2P: DHT created');

      // Create onion context
      _onion = _native!.createOnion(_router!, _localId!);
      _native!.onionSetHops(_onion!, _hopCount);
      debugPrint('P2P: Onion context created (hops: $_hopCount)');

      // Create discovery
      _discovery = _native!.createDiscovery(_peerTable!, _transport!, _localId!);
      _native!.discoverySetDht(_discovery!, _dht!);
      debugPrint('P2P: Discovery created');

      // Start components
      _native!.startRouter(_router!);
      _native!.startDiscovery(_discovery!);
      debugPrint('P2P: Router and discovery started');

      _isInitialized = true;
      _setStatus(P2PConnectionStatus.connecting);

      // Start background polling
      await _startPolling();

      debugPrint('P2P: Initialization complete');
    } catch (e) {
      debugPrint('P2P: Initialization failed: $e');
      await shutdown();
      rethrow;
    }
  }

  // Set onion hop count
  void setHopCount(int hops) {
    if (hops < 1 || hops > 8) {
      throw ArgumentError('Hop count must be between 1 and 8');
    }
    _hopCount = hops;
    if (_onion != null && _native != null) {
      _native!.onionSetHops(_onion!, hops);
    }
    debugPrint('P2P: Hop count set to $hops');
  }

  // Get onion public key
  Uint8List? getOnionPubkey() {
    if (_onion == null || _native == null) return null;
    try {
      return _native!.onionGetPubkey(_onion!);
    } catch (e) {
      debugPrint('P2P: Failed to get onion pubkey: $e');
      return null;
    }
  }

  // Add peer's onion public key
  void addPeerOnionKey(Uint8List peerId, Uint8List pubkey) {
    if (_onion == null || _native == null) {
      throw StateError('P2P not initialized');
    }
    _native!.onionAddPeerKey(_onion!, peerId, pubkey);
    debugPrint('P2P: Added onion key for peer ${_bytesToHex(peerId).substring(0, 8)}');
  }

  // Send message via mesh routing (direct)
  Future<void> send(Uint8List destination, Uint8List data) async {
    if (!_isInitialized || _router == null) {
      throw StateError('P2P not initialized');
    }
    _native!.routerSend(_router!, destination, data);
    debugPrint(
        'P2P: Sent ${data.length} bytes to ${_bytesToHex(destination).substring(0, 8)}');
  }

  // Send message via onion routing (anonymous)
  Future<void> sendAnonymous(Uint8List destination, Uint8List data) async {
    if (!_isInitialized || _onion == null) {
      throw StateError('P2P not initialized');
    }
    _native!.onionSend(_onion!, destination, data);
    debugPrint(
        'P2P: Sent ${data.length} bytes anonymously to ${_bytesToHex(destination).substring(0, 8)} (hops: $_hopCount)');
  }

  // Add node to DHT
  void addToDht(Uint8List nodeId) {
    if (_dht == null || _native == null) {
      throw StateError('P2P not initialized');
    }
    _native!.dhtAddNode(_dht!, nodeId);
    debugPrint('P2P: Added node to DHT: ${_bytesToHex(nodeId).substring(0, 8)}');
  }

  // Get peer count
  int get peerCount {
    if (_peerTable == null || _native == null) return 0;
    return _native!.getPeerCount(_peerTable!);
  }

  // Shutdown P2P networking
  Future<void> shutdown() async {
    debugPrint('P2P: Shutting down...');

    // Stop polling
    await _stopPolling();

    // Stop and destroy components in reverse order
    if (_discovery != null && _native != null) {
      try {
        _native!.stopDiscovery(_discovery!);
        _native!.destroyDiscovery(_discovery!);
      } catch (_) {}
      _discovery = null;
    }

    if (_onion != null && _native != null) {
      try {
        _native!.destroyOnion(_onion!);
      } catch (_) {}
      _onion = null;
    }

    if (_dht != null && _native != null) {
      try {
        _native!.destroyDht(_dht!);
      } catch (_) {}
      _dht = null;
    }

    if (_router != null && _native != null) {
      try {
        _native!.stopRouter(_router!);
        _native!.destroyRouter(_router!);
      } catch (_) {}
      _router = null;
    }

    if (_peerTable != null && _native != null) {
      try {
        _native!.destroyPeerTable(_peerTable!);
      } catch (_) {}
      _peerTable = null;
    }

    if (_transport != null && _native != null) {
      try {
        _native!.destroyTransport(_transport!);
      } catch (_) {}
      _transport = null;
    }

    if (_native != null) {
      try {
        _native!.shutdown();
      } catch (_) {}
      _native = null;
    }

    _isInitialized = false;
    _setStatus(P2PConnectionStatus.disconnected);

    debugPrint('P2P: Shutdown complete');
  }

  // Start background polling
  Future<void> _startPolling() async {
    if (_pollIsolate != null) return;

    _receivePort = ReceivePort();
    _receivePort!.listen(_handleIsolateMessage);

    // Create polling parameters
    final params = P2PPollingParams(
      sendPort: _receivePort!.sendPort,
      pollIntervalMs: 50,
    );

    // Spawn isolate
    _pollIsolate = await Isolate.spawn(p2pPollingIsolate, params);
    debugPrint('P2P: Polling isolate started');
  }

  // Stop background polling
  Future<void> _stopPolling() async {
    if (_sendPort != null) {
      _sendPort!.send(P2PPollingCommand.stop);
    }

    _pollIsolate?.kill(priority: Isolate.immediate);
    _pollIsolate = null;

    _receivePort?.close();
    _receivePort = null;
    _sendPort = null;

    debugPrint('P2P: Polling isolate stopped');
  }

  // Handle messages from polling isolate
  void _handleIsolateMessage(dynamic message) {
    if (message is SendPort) {
      _sendPort = message;
      // Isolate ready, start polling
      _requestPoll();
    } else if (message is P2PPollingResult) {
      // Process polling result
      _processPollingResult(message);
      // Request next poll
      _requestPoll();
    }
  }

  // Request a poll from the isolate
  void _requestPoll() {
    if (_sendPort == null || !_isInitialized) return;

    final nowMs = DateTime.now().millisecondsSinceEpoch;
    _sendPort!.send(P2PPollingRequest(nowMs: nowMs));

    // Do the actual polling here (since FFI can't be passed to isolate)
    _doPoll(nowMs);
  }

  // Perform polling
  void _doPoll(int nowMs) {
    if (!_isInitialized || _native == null) return;

    try {
      // Poll transport
      if (_transport != null) {
        _native!.pollTransport(_transport!, 10);
      }

      // Poll router
      if (_router != null) {
        _native!.pollRouter(_router!, nowMs);
      }

      // Poll DHT
      if (_dht != null) {
        _native!.pollDht(_dht!, nowMs);
      }

      // Poll onion
      if (_onion != null) {
        _native!.pollOnion(_onion!, nowMs);
      }

      // Poll discovery
      if (_discovery != null) {
        _native!.pollDiscovery(_discovery!, nowMs);
      }

      // Update status based on peer count
      final peers = peerCount;
      if (peers > 0 && _status == P2PConnectionStatus.connecting) {
        _setStatus(P2PConnectionStatus.connected);
      }
    } catch (e) {
      debugPrint('P2P: Poll error: $e');
    }
  }

  // Process polling result
  void _processPollingResult(P2PPollingResult result) {
    // Handle events from native code
    // (Currently events are handled synchronously in _doPoll)
  }

  // Set status and notify
  void _setStatus(P2PConnectionStatus newStatus) {
    if (_status != newStatus) {
      _status = newStatus;
      onStatusChanged?.call(newStatus);
      debugPrint('P2P: Status changed to $newStatus');
    }
  }

  // Utility: bytes to hex
  String _bytesToHex(Uint8List bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
