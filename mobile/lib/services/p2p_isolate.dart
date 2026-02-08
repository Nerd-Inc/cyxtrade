// P2P Isolate - Background polling for P2P networking
//
// Runs in a separate isolate to handle network polling
// without blocking the UI thread.

import 'dart:async';
import 'dart:isolate';

// Polling parameters passed to isolate
class P2PPollingParams {
  final SendPort sendPort;
  final int pollIntervalMs;

  P2PPollingParams({
    required this.sendPort,
    this.pollIntervalMs = 50,
  });
}

// Commands to the polling isolate
enum P2PPollingCommand {
  stop,
}

// Request a poll
class P2PPollingRequest {
  final int nowMs;

  P2PPollingRequest({required this.nowMs});
}

// Result from polling
class P2PPollingResult {
  final int pollTimeMs;
  final List<P2PEvent> events;

  P2PPollingResult({
    required this.pollTimeMs,
    this.events = const [],
  });
}

// Event types
enum P2PEventType {
  messageReceived,
  peerDiscovered,
  peerDisconnected,
  connectionStatusChanged,
}

// Event from P2P layer
class P2PEvent {
  final P2PEventType type;
  final dynamic data;

  P2PEvent(this.type, this.data);
}

// Main isolate entry point
void p2pPollingIsolate(P2PPollingParams params) {
  // Create receive port for commands
  final receivePort = ReceivePort();

  // Send our send port back to main isolate
  params.sendPort.send(receivePort.sendPort);

  bool running = true;

  // Listen for commands/requests
  receivePort.listen((message) {
    if (message == P2PPollingCommand.stop) {
      running = false;
      receivePort.close();
      return;
    }

    if (message is P2PPollingRequest) {
      // Send back timing info for the main isolate to do actual FFI polling
      // (FFI pointers can't be passed across isolates)
      final result = P2PPollingResult(pollTimeMs: message.nowMs);
      params.sendPort.send(result);
    }
  });

  // Keep isolate alive
  Timer.periodic(Duration(milliseconds: params.pollIntervalMs), (timer) {
    if (!running) {
      timer.cancel();
    }
  });
}

// Peer discovery service (uses DHT for decentralized lookup)
class PeerDiscoveryService {
  // Cache of known peer addresses
  final Map<String, PeerAddress> _peerCache = {};

  // Get cached peer address
  PeerAddress? getCachedPeer(String peerId) {
    return _peerCache[peerId];
  }

  // Cache peer address
  void cachePeer(String peerId, PeerAddress address) {
    _peerCache[peerId] = address;
  }

  // Clear cache
  void clearCache() {
    _peerCache.clear();
  }
}

// Peer address info
class PeerAddress {
  final String nodeIdHex;
  final String? ipAddress;
  final int? port;
  final DateTime discoveredAt;
  final bool isRelay;

  PeerAddress({
    required this.nodeIdHex,
    this.ipAddress,
    this.port,
    required this.discoveredAt,
    this.isRelay = false,
  });

  @override
  String toString() {
    if (isRelay) {
      return 'relay:$nodeIdHex';
    }
    return '$ipAddress:$port';
  }
}
