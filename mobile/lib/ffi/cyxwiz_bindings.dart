// CyxWiz FFI Bindings
//
// Dart FFI bindings for the CyxWiz native library.
// Provides P2P mesh networking with onion routing.

import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

// Error codes (matching C header)
class CyxwizError {
  static const int ok = 0;
  static const int invalidArg = -1;
  static const int noMemory = -2;
  static const int notFound = -3;
  static const int timeout = -4;
  static const int busy = -5;
  static const int cryptoFailed = -6;
  static const int networkError = -7;
  static const int notInitialized = -8;
}

// Node ID size (32 bytes)
const int nodeIdSize = 32;

// Public key size (32 bytes)
const int pubkeySize = 32;

// FFI function signatures
typedef _InitNative = Int32 Function();
typedef _InitDart = int Function();

typedef _ShutdownNative = Void Function();
typedef _ShutdownDart = void Function();

typedef _TransportCreateNative = Int32 Function(
  Pointer<Pointer<Void>> out,
  Pointer<Utf8> bootstrap,
  IntPtr len,
);
typedef _TransportCreateDart = int Function(
  Pointer<Pointer<Void>> out,
  Pointer<Utf8> bootstrap,
  int len,
);

typedef _TransportDestroyNative = Void Function(Pointer<Void> ctx);
typedef _TransportDestroyDart = void Function(Pointer<Void> ctx);

typedef _TransportPollNative = Int32 Function(Pointer<Void> ctx, Uint32 timeoutMs);
typedef _TransportPollDart = int Function(Pointer<Void> ctx, int timeoutMs);

typedef _PeerTableCreateNative = Int32 Function(Pointer<Pointer<Void>> out);
typedef _PeerTableCreateDart = int Function(Pointer<Pointer<Void>> out);

typedef _PeerTableDestroyNative = Void Function(Pointer<Void> table);
typedef _PeerTableDestroyDart = void Function(Pointer<Void> table);

typedef _PeerTableCountNative = IntPtr Function(Pointer<Void> table);
typedef _PeerTableCountDart = int Function(Pointer<Void> table);

typedef _RouterCreateNative = Int32 Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> peers,
  Pointer<Void> transport,
  Pointer<Uint8> localId,
);
typedef _RouterCreateDart = int Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> peers,
  Pointer<Void> transport,
  Pointer<Uint8> localId,
);

typedef _RouterDestroyNative = Void Function(Pointer<Void> router);
typedef _RouterDestroyDart = void Function(Pointer<Void> router);

typedef _RouterStartNative = Int32 Function(Pointer<Void> router);
typedef _RouterStartDart = int Function(Pointer<Void> router);

typedef _RouterStopNative = Int32 Function(Pointer<Void> router);
typedef _RouterStopDart = int Function(Pointer<Void> router);

typedef _RouterPollNative = Int32 Function(Pointer<Void> router, Uint64 nowMs);
typedef _RouterPollDart = int Function(Pointer<Void> router, int nowMs);

typedef _RouterSendNative = Int32 Function(
  Pointer<Void> router,
  Pointer<Uint8> dest,
  Pointer<Uint8> data,
  IntPtr len,
);
typedef _RouterSendDart = int Function(
  Pointer<Void> router,
  Pointer<Uint8> dest,
  Pointer<Uint8> data,
  int len,
);

typedef _DhtCreateNative = Int32 Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> router,
  Pointer<Uint8> localId,
);
typedef _DhtCreateDart = int Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> router,
  Pointer<Uint8> localId,
);

typedef _DhtDestroyNative = Void Function(Pointer<Void> dht);
typedef _DhtDestroyDart = void Function(Pointer<Void> dht);

typedef _DhtPollNative = Int32 Function(Pointer<Void> dht, Uint64 nowMs);
typedef _DhtPollDart = int Function(Pointer<Void> dht, int nowMs);

typedef _DhtFindNodeNative = Int32 Function(
  Pointer<Void> dht,
  Pointer<Uint8> target,
  Pointer<NativeFunction<Void Function(Pointer<Uint8>, Pointer<Void>)>> callback,
  Pointer<Void> userData,
);
typedef _DhtFindNodeDart = int Function(
  Pointer<Void> dht,
  Pointer<Uint8> target,
  Pointer<NativeFunction<Void Function(Pointer<Uint8>, Pointer<Void>)>> callback,
  Pointer<Void> userData,
);

typedef _DhtAddNodeNative = Int32 Function(Pointer<Void> dht, Pointer<Uint8> nodeId);
typedef _DhtAddNodeDart = int Function(Pointer<Void> dht, Pointer<Uint8> nodeId);

typedef _OnionCreateNative = Int32 Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> router,
  Pointer<Uint8> localId,
);
typedef _OnionCreateDart = int Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> router,
  Pointer<Uint8> localId,
);

typedef _OnionDestroyNative = Void Function(Pointer<Void> onion);
typedef _OnionDestroyDart = void Function(Pointer<Void> onion);

typedef _OnionPollNative = Int32 Function(Pointer<Void> onion, Uint64 nowMs);
typedef _OnionPollDart = int Function(Pointer<Void> onion, int nowMs);

typedef _OnionSendNative = Int32 Function(
  Pointer<Void> onion,
  Pointer<Uint8> dest,
  Pointer<Uint8> data,
  IntPtr len,
);
typedef _OnionSendDart = int Function(
  Pointer<Void> onion,
  Pointer<Uint8> dest,
  Pointer<Uint8> data,
  int len,
);

typedef _OnionGetPubkeyNative = Int32 Function(Pointer<Void> onion, Pointer<Uint8> out);
typedef _OnionGetPubkeyDart = int Function(Pointer<Void> onion, Pointer<Uint8> out);

typedef _OnionAddPeerKeyNative = Int32 Function(
  Pointer<Void> onion,
  Pointer<Uint8> peerId,
  Pointer<Uint8> pubkey,
);
typedef _OnionAddPeerKeyDart = int Function(
  Pointer<Void> onion,
  Pointer<Uint8> peerId,
  Pointer<Uint8> pubkey,
);

typedef _OnionSetCallbackNative = Int32 Function(
  Pointer<Void> onion,
  Pointer<NativeFunction<Void Function(Pointer<Uint8>, Pointer<Uint8>, IntPtr, Pointer<Void>)>>
      callback,
  Pointer<Void> userData,
);
typedef _OnionSetCallbackDart = int Function(
  Pointer<Void> onion,
  Pointer<NativeFunction<Void Function(Pointer<Uint8>, Pointer<Uint8>, IntPtr, Pointer<Void>)>>
      callback,
  Pointer<Void> userData,
);

typedef _OnionSetHopsNative = Int32 Function(Pointer<Void> onion, Uint8 hops);
typedef _OnionSetHopsDart = int Function(Pointer<Void> onion, int hops);

typedef _DiscoveryCreateNative = Int32 Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> peers,
  Pointer<Void> transport,
  Pointer<Uint8> localId,
);
typedef _DiscoveryCreateDart = int Function(
  Pointer<Pointer<Void>> out,
  Pointer<Void> peers,
  Pointer<Void> transport,
  Pointer<Uint8> localId,
);

typedef _DiscoveryDestroyNative = Void Function(Pointer<Void> discovery);
typedef _DiscoveryDestroyDart = void Function(Pointer<Void> discovery);

typedef _DiscoveryStartNative = Int32 Function(Pointer<Void> discovery);
typedef _DiscoveryStartDart = int Function(Pointer<Void> discovery);

typedef _DiscoveryStopNative = Int32 Function(Pointer<Void> discovery);
typedef _DiscoveryStopDart = int Function(Pointer<Void> discovery);

typedef _DiscoveryPollNative = Int32 Function(Pointer<Void> discovery, Uint64 nowMs);
typedef _DiscoveryPollDart = int Function(Pointer<Void> discovery, int nowMs);

typedef _DiscoverySetDhtNative = Int32 Function(Pointer<Void> discovery, Pointer<Void> dht);
typedef _DiscoverySetDhtDart = int Function(Pointer<Void> discovery, Pointer<Void> dht);

typedef _GenerateNodeIdNative = Int32 Function(Pointer<Uint8> out);
typedef _GenerateNodeIdDart = int Function(Pointer<Uint8> out);

// CyxWiz native library bindings
class CyxwizBindings {
  static CyxwizBindings? _instance;
  late final DynamicLibrary _lib;

  // Function pointers
  late final _InitDart init;
  late final _ShutdownDart shutdown;
  late final _TransportCreateDart transportCreate;
  late final _TransportDestroyDart transportDestroy;
  late final _TransportPollDart transportPoll;
  late final _PeerTableCreateDart peerTableCreate;
  late final _PeerTableDestroyDart peerTableDestroy;
  late final _PeerTableCountDart peerTableCount;
  late final _RouterCreateDart routerCreate;
  late final _RouterDestroyDart routerDestroy;
  late final _RouterStartDart routerStart;
  late final _RouterStopDart routerStop;
  late final _RouterPollDart routerPoll;
  late final _RouterSendDart routerSend;
  late final _DhtCreateDart dhtCreate;
  late final _DhtDestroyDart dhtDestroy;
  late final _DhtPollDart dhtPoll;
  late final _DhtFindNodeDart dhtFindNode;
  late final _DhtAddNodeDart dhtAddNode;
  late final _OnionCreateDart onionCreate;
  late final _OnionDestroyDart onionDestroy;
  late final _OnionPollDart onionPoll;
  late final _OnionSendDart onionSend;
  late final _OnionGetPubkeyDart onionGetPubkey;
  late final _OnionAddPeerKeyDart onionAddPeerKey;
  late final _OnionSetCallbackDart onionSetCallback;
  late final _OnionSetHopsDart onionSetHops;
  late final _DiscoveryCreateDart discoveryCreate;
  late final _DiscoveryDestroyDart discoveryDestroy;
  late final _DiscoveryStartDart discoveryStart;
  late final _DiscoveryStopDart discoveryStop;
  late final _DiscoveryPollDart discoveryPoll;
  late final _DiscoverySetDhtDart discoverySetDht;
  late final _GenerateNodeIdDart generateNodeId;

  CyxwizBindings._() {
    _lib = _loadLibrary();
    _bindFunctions();
  }

  factory CyxwizBindings() {
    _instance ??= CyxwizBindings._();
    return _instance!;
  }

  DynamicLibrary _loadLibrary() {
    if (Platform.isWindows) {
      return DynamicLibrary.open('cyxwiz_ffi.dll');
    } else if (Platform.isAndroid) {
      return DynamicLibrary.open('libcyxwiz_ffi.so');
    } else if (Platform.isIOS) {
      return DynamicLibrary.process();
    } else if (Platform.isMacOS) {
      return DynamicLibrary.open('libcyxwiz_ffi.dylib');
    } else if (Platform.isLinux) {
      return DynamicLibrary.open('libcyxwiz_ffi.so');
    } else {
      throw UnsupportedError('Unsupported platform: ${Platform.operatingSystem}');
    }
  }

  void _bindFunctions() {
    init = _lib.lookupFunction<_InitNative, _InitDart>('cyxwiz_ffi_init');
    shutdown = _lib.lookupFunction<_ShutdownNative, _ShutdownDart>('cyxwiz_ffi_shutdown');

    transportCreate = _lib.lookupFunction<_TransportCreateNative, _TransportCreateDart>(
        'cyxwiz_ffi_transport_create');
    transportDestroy = _lib.lookupFunction<_TransportDestroyNative, _TransportDestroyDart>(
        'cyxwiz_ffi_transport_destroy');
    transportPoll = _lib.lookupFunction<_TransportPollNative, _TransportPollDart>(
        'cyxwiz_ffi_transport_poll');

    peerTableCreate = _lib.lookupFunction<_PeerTableCreateNative, _PeerTableCreateDart>(
        'cyxwiz_ffi_peer_table_create');
    peerTableDestroy = _lib.lookupFunction<_PeerTableDestroyNative, _PeerTableDestroyDart>(
        'cyxwiz_ffi_peer_table_destroy');
    peerTableCount = _lib.lookupFunction<_PeerTableCountNative, _PeerTableCountDart>(
        'cyxwiz_ffi_peer_table_count');

    routerCreate =
        _lib.lookupFunction<_RouterCreateNative, _RouterCreateDart>('cyxwiz_ffi_router_create');
    routerDestroy =
        _lib.lookupFunction<_RouterDestroyNative, _RouterDestroyDart>('cyxwiz_ffi_router_destroy');
    routerStart =
        _lib.lookupFunction<_RouterStartNative, _RouterStartDart>('cyxwiz_ffi_router_start');
    routerStop = _lib.lookupFunction<_RouterStopNative, _RouterStopDart>('cyxwiz_ffi_router_stop');
    routerPoll = _lib.lookupFunction<_RouterPollNative, _RouterPollDart>('cyxwiz_ffi_router_poll');
    routerSend = _lib.lookupFunction<_RouterSendNative, _RouterSendDart>('cyxwiz_ffi_router_send');

    dhtCreate = _lib.lookupFunction<_DhtCreateNative, _DhtCreateDart>('cyxwiz_ffi_dht_create');
    dhtDestroy = _lib.lookupFunction<_DhtDestroyNative, _DhtDestroyDart>('cyxwiz_ffi_dht_destroy');
    dhtPoll = _lib.lookupFunction<_DhtPollNative, _DhtPollDart>('cyxwiz_ffi_dht_poll');
    dhtFindNode =
        _lib.lookupFunction<_DhtFindNodeNative, _DhtFindNodeDart>('cyxwiz_ffi_dht_find_node');
    dhtAddNode = _lib.lookupFunction<_DhtAddNodeNative, _DhtAddNodeDart>('cyxwiz_ffi_dht_add_node');

    onionCreate =
        _lib.lookupFunction<_OnionCreateNative, _OnionCreateDart>('cyxwiz_ffi_onion_create');
    onionDestroy =
        _lib.lookupFunction<_OnionDestroyNative, _OnionDestroyDart>('cyxwiz_ffi_onion_destroy');
    onionPoll = _lib.lookupFunction<_OnionPollNative, _OnionPollDart>('cyxwiz_ffi_onion_poll');
    onionSend = _lib.lookupFunction<_OnionSendNative, _OnionSendDart>('cyxwiz_ffi_onion_send');
    onionGetPubkey = _lib.lookupFunction<_OnionGetPubkeyNative, _OnionGetPubkeyDart>(
        'cyxwiz_ffi_onion_get_pubkey');
    onionAddPeerKey = _lib.lookupFunction<_OnionAddPeerKeyNative, _OnionAddPeerKeyDart>(
        'cyxwiz_ffi_onion_add_peer_key');
    onionSetCallback = _lib.lookupFunction<_OnionSetCallbackNative, _OnionSetCallbackDart>(
        'cyxwiz_ffi_onion_set_callback');
    onionSetHops =
        _lib.lookupFunction<_OnionSetHopsNative, _OnionSetHopsDart>('cyxwiz_ffi_onion_set_hops');

    discoveryCreate = _lib.lookupFunction<_DiscoveryCreateNative, _DiscoveryCreateDart>(
        'cyxwiz_ffi_discovery_create');
    discoveryDestroy = _lib.lookupFunction<_DiscoveryDestroyNative, _DiscoveryDestroyDart>(
        'cyxwiz_ffi_discovery_destroy');
    discoveryStart = _lib.lookupFunction<_DiscoveryStartNative, _DiscoveryStartDart>(
        'cyxwiz_ffi_discovery_start');
    discoveryStop =
        _lib.lookupFunction<_DiscoveryStopNative, _DiscoveryStopDart>('cyxwiz_ffi_discovery_stop');
    discoveryPoll =
        _lib.lookupFunction<_DiscoveryPollNative, _DiscoveryPollDart>('cyxwiz_ffi_discovery_poll');
    discoverySetDht = _lib.lookupFunction<_DiscoverySetDhtNative, _DiscoverySetDhtDart>(
        'cyxwiz_ffi_discovery_set_dht');

    generateNodeId = _lib.lookupFunction<_GenerateNodeIdNative, _GenerateNodeIdDart>(
        'cyxwiz_ffi_generate_node_id');
  }
}

// High-level Dart wrapper for CyxWiz
class CyxwizNative {
  final CyxwizBindings _bindings;
  bool _initialized = false;

  CyxwizNative() : _bindings = CyxwizBindings();

  bool get isInitialized => _initialized;

  // Initialize the library (must be called first)
  void initialize() {
    if (_initialized) return;
    final result = _bindings.init();
    if (result != CyxwizError.ok) {
      throw CyxwizException('Failed to initialize CyxWiz', result);
    }
    _initialized = true;
  }

  // Shutdown the library
  void shutdown() {
    if (!_initialized) return;
    _bindings.shutdown();
    _initialized = false;
  }

  // Generate a random node ID
  Uint8List generateNodeId() {
    final ptr = calloc<Uint8>(nodeIdSize);
    try {
      final result = _bindings.generateNodeId(ptr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to generate node ID', result);
      }
      return Uint8List.fromList(ptr.asTypedList(nodeIdSize));
    } finally {
      calloc.free(ptr);
    }
  }

  // Create UDP transport with bootstrap server
  Pointer<Void> createTransport(String bootstrapAddress) {
    final outPtr = calloc<Pointer<Void>>();
    final addrPtr = bootstrapAddress.toNativeUtf8();
    try {
      final result = _bindings.transportCreate(outPtr, addrPtr, bootstrapAddress.length);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create transport', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
      calloc.free(addrPtr);
    }
  }

  // Destroy transport
  void destroyTransport(Pointer<Void> transport) {
    _bindings.transportDestroy(transport);
  }

  // Poll transport for events
  int pollTransport(Pointer<Void> transport, int timeoutMs) {
    return _bindings.transportPoll(transport, timeoutMs);
  }

  // Create peer table
  Pointer<Void> createPeerTable() {
    final outPtr = calloc<Pointer<Void>>();
    try {
      final result = _bindings.peerTableCreate(outPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create peer table', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
    }
  }

  // Destroy peer table
  void destroyPeerTable(Pointer<Void> peerTable) {
    _bindings.peerTableDestroy(peerTable);
  }

  // Get peer count
  int getPeerCount(Pointer<Void> peerTable) {
    return _bindings.peerTableCount(peerTable);
  }

  // Create router
  Pointer<Void> createRouter(
    Pointer<Void> peerTable,
    Pointer<Void> transport,
    Uint8List localId,
  ) {
    if (localId.length != nodeIdSize) {
      throw ArgumentError('Local ID must be $nodeIdSize bytes');
    }
    final outPtr = calloc<Pointer<Void>>();
    final idPtr = calloc<Uint8>(nodeIdSize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        idPtr[i] = localId[i];
      }
      final result = _bindings.routerCreate(outPtr, peerTable, transport, idPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create router', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
      calloc.free(idPtr);
    }
  }

  // Destroy router
  void destroyRouter(Pointer<Void> router) {
    _bindings.routerDestroy(router);
  }

  // Start router
  void startRouter(Pointer<Void> router) {
    final result = _bindings.routerStart(router);
    if (result != CyxwizError.ok) {
      throw CyxwizException('Failed to start router', result);
    }
  }

  // Stop router
  void stopRouter(Pointer<Void> router) {
    _bindings.routerStop(router);
  }

  // Poll router
  void pollRouter(Pointer<Void> router, int nowMs) {
    _bindings.routerPoll(router, nowMs);
  }

  // Send data via router
  void routerSend(Pointer<Void> router, Uint8List destination, Uint8List data) {
    if (destination.length != nodeIdSize) {
      throw ArgumentError('Destination must be $nodeIdSize bytes');
    }
    final destPtr = calloc<Uint8>(nodeIdSize);
    final dataPtr = calloc<Uint8>(data.length);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        destPtr[i] = destination[i];
      }
      for (int i = 0; i < data.length; i++) {
        dataPtr[i] = data[i];
      }
      final result = _bindings.routerSend(router, destPtr, dataPtr, data.length);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to send via router', result);
      }
    } finally {
      calloc.free(destPtr);
      calloc.free(dataPtr);
    }
  }

  // Create DHT
  Pointer<Void> createDht(Pointer<Void> router, Uint8List localId) {
    if (localId.length != nodeIdSize) {
      throw ArgumentError('Local ID must be $nodeIdSize bytes');
    }
    final outPtr = calloc<Pointer<Void>>();
    final idPtr = calloc<Uint8>(nodeIdSize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        idPtr[i] = localId[i];
      }
      final result = _bindings.dhtCreate(outPtr, router, idPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create DHT', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
      calloc.free(idPtr);
    }
  }

  // Destroy DHT
  void destroyDht(Pointer<Void> dht) {
    _bindings.dhtDestroy(dht);
  }

  // Poll DHT
  void pollDht(Pointer<Void> dht, int nowMs) {
    _bindings.dhtPoll(dht, nowMs);
  }

  // Add node to DHT
  void dhtAddNode(Pointer<Void> dht, Uint8List nodeId) {
    if (nodeId.length != nodeIdSize) {
      throw ArgumentError('Node ID must be $nodeIdSize bytes');
    }
    final idPtr = calloc<Uint8>(nodeIdSize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        idPtr[i] = nodeId[i];
      }
      final result = _bindings.dhtAddNode(dht, idPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to add node to DHT', result);
      }
    } finally {
      calloc.free(idPtr);
    }
  }

  // Create onion context
  Pointer<Void> createOnion(Pointer<Void> router, Uint8List localId) {
    if (localId.length != nodeIdSize) {
      throw ArgumentError('Local ID must be $nodeIdSize bytes');
    }
    final outPtr = calloc<Pointer<Void>>();
    final idPtr = calloc<Uint8>(nodeIdSize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        idPtr[i] = localId[i];
      }
      final result = _bindings.onionCreate(outPtr, router, idPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create onion context', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
      calloc.free(idPtr);
    }
  }

  // Destroy onion context
  void destroyOnion(Pointer<Void> onion) {
    _bindings.onionDestroy(onion);
  }

  // Poll onion
  void pollOnion(Pointer<Void> onion, int nowMs) {
    _bindings.onionPoll(onion, nowMs);
  }

  // Send via onion routing (anonymous)
  void onionSend(Pointer<Void> onion, Uint8List destination, Uint8List data) {
    if (destination.length != nodeIdSize) {
      throw ArgumentError('Destination must be $nodeIdSize bytes');
    }
    final destPtr = calloc<Uint8>(nodeIdSize);
    final dataPtr = calloc<Uint8>(data.length);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        destPtr[i] = destination[i];
      }
      for (int i = 0; i < data.length; i++) {
        dataPtr[i] = data[i];
      }
      final result = _bindings.onionSend(onion, destPtr, dataPtr, data.length);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to send via onion', result);
      }
    } finally {
      calloc.free(destPtr);
      calloc.free(dataPtr);
    }
  }

  // Get onion public key
  Uint8List onionGetPubkey(Pointer<Void> onion) {
    final pubkeyPtr = calloc<Uint8>(pubkeySize);
    try {
      final result = _bindings.onionGetPubkey(onion, pubkeyPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to get onion pubkey', result);
      }
      return Uint8List.fromList(pubkeyPtr.asTypedList(pubkeySize));
    } finally {
      calloc.free(pubkeyPtr);
    }
  }

  // Add peer's public key for onion encryption
  void onionAddPeerKey(Pointer<Void> onion, Uint8List peerId, Uint8List pubkey) {
    if (peerId.length != nodeIdSize) {
      throw ArgumentError('Peer ID must be $nodeIdSize bytes');
    }
    if (pubkey.length != pubkeySize) {
      throw ArgumentError('Pubkey must be $pubkeySize bytes');
    }
    final peerIdPtr = calloc<Uint8>(nodeIdSize);
    final pubkeyPtr = calloc<Uint8>(pubkeySize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        peerIdPtr[i] = peerId[i];
      }
      for (int i = 0; i < pubkeySize; i++) {
        pubkeyPtr[i] = pubkey[i];
      }
      final result = _bindings.onionAddPeerKey(onion, peerIdPtr, pubkeyPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to add peer key', result);
      }
    } finally {
      calloc.free(peerIdPtr);
      calloc.free(pubkeyPtr);
    }
  }

  // Set onion hop count
  void onionSetHops(Pointer<Void> onion, int hops) {
    final result = _bindings.onionSetHops(onion, hops);
    if (result != CyxwizError.ok) {
      throw CyxwizException('Failed to set hop count', result);
    }
  }

  // Create discovery
  Pointer<Void> createDiscovery(
    Pointer<Void> peerTable,
    Pointer<Void> transport,
    Uint8List localId,
  ) {
    if (localId.length != nodeIdSize) {
      throw ArgumentError('Local ID must be $nodeIdSize bytes');
    }
    final outPtr = calloc<Pointer<Void>>();
    final idPtr = calloc<Uint8>(nodeIdSize);
    try {
      for (int i = 0; i < nodeIdSize; i++) {
        idPtr[i] = localId[i];
      }
      final result = _bindings.discoveryCreate(outPtr, peerTable, transport, idPtr);
      if (result != CyxwizError.ok) {
        throw CyxwizException('Failed to create discovery', result);
      }
      return outPtr.value;
    } finally {
      calloc.free(outPtr);
      calloc.free(idPtr);
    }
  }

  // Destroy discovery
  void destroyDiscovery(Pointer<Void> discovery) {
    _bindings.discoveryDestroy(discovery);
  }

  // Start discovery
  void startDiscovery(Pointer<Void> discovery) {
    final result = _bindings.discoveryStart(discovery);
    if (result != CyxwizError.ok) {
      throw CyxwizException('Failed to start discovery', result);
    }
  }

  // Stop discovery
  void stopDiscovery(Pointer<Void> discovery) {
    _bindings.discoveryStop(discovery);
  }

  // Poll discovery
  void pollDiscovery(Pointer<Void> discovery, int nowMs) {
    _bindings.discoveryPoll(discovery, nowMs);
  }

  // Set DHT for discovery
  void discoverySetDht(Pointer<Void> discovery, Pointer<Void> dht) {
    final result = _bindings.discoverySetDht(discovery, dht);
    if (result != CyxwizError.ok) {
      throw CyxwizException('Failed to set DHT for discovery', result);
    }
  }
}

// Exception for CyxWiz errors
class CyxwizException implements Exception {
  final String message;
  final int errorCode;

  CyxwizException(this.message, this.errorCode);

  @override
  String toString() => 'CyxwizException: $message (error code: $errorCode)';
}
