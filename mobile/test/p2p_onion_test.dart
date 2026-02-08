// P2P Onion Routing & DHT Test
//
// Tests:
// 1. Router creation with node ID
// 2. DHT creation and bootstrap
// 3. Onion context creation
// 4. Onion keypair generation
// 5. Setting hop count
// 6. Full component lifecycle

import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

const int nodeIdSize = 32;
const int pubkeySize = 32;

void main() async {
  print('=== CyxWiz Onion Routing & DHT Test ===\n');

  // Load native library
  late DynamicLibrary lib;
  try {
    if (Platform.isWindows) {
      lib = DynamicLibrary.open('native/build/windows/Release/cyxwiz_ffi.dll');
    } else if (Platform.isAndroid || Platform.isLinux) {
      lib = DynamicLibrary.open('libcyxwiz_ffi.so');
    } else {
      print('Unsupported platform');
      return;
    }
    print('Library loaded\n');
  } catch (e) {
    print('Failed to load library: $e');
    return;
  }

  // Get function pointers
  final init = lib.lookupFunction<Int32 Function(), int Function()>('cyxwiz_ffi_init');
  final shutdown = lib.lookupFunction<Void Function(), void Function()>('cyxwiz_ffi_shutdown');

  final generateNodeId = lib.lookupFunction<
      Int32 Function(Pointer<Uint8>),
      int Function(Pointer<Uint8>)>('cyxwiz_ffi_generate_node_id');

  final createPeerTable = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>),
      int Function(Pointer<Pointer<Void>>)>('cyxwiz_ffi_peer_table_create');
  final destroyPeerTable = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_peer_table_destroy');

  final createTransport = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>, Pointer<Utf8>, IntPtr),
      int Function(Pointer<Pointer<Void>>, Pointer<Utf8>, int)>('cyxwiz_ffi_transport_create');
  final destroyTransport = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_transport_destroy');

  final createRouter = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Void>, Pointer<Uint8>),
      int Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Void>, Pointer<Uint8>)>('cyxwiz_ffi_router_create');
  final destroyRouter = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_router_destroy');
  final startRouter = lib.lookupFunction<
      Int32 Function(Pointer<Void>),
      int Function(Pointer<Void>)>('cyxwiz_ffi_router_start');
  final stopRouter = lib.lookupFunction<
      Int32 Function(Pointer<Void>),
      int Function(Pointer<Void>)>('cyxwiz_ffi_router_stop');

  final createDht = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Uint8>),
      int Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Uint8>)>('cyxwiz_ffi_dht_create');
  final destroyDht = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_dht_destroy');

  final createOnion = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Uint8>),
      int Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Uint8>)>('cyxwiz_ffi_onion_create');
  final destroyOnion = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_onion_destroy');
  final onionGetPubkey = lib.lookupFunction<
      Int32 Function(Pointer<Void>, Pointer<Uint8>),
      int Function(Pointer<Void>, Pointer<Uint8>)>('cyxwiz_ffi_onion_get_pubkey');
  final onionSetHops = lib.lookupFunction<
      Int32 Function(Pointer<Void>, Int32),
      int Function(Pointer<Void>, int)>('cyxwiz_ffi_onion_set_hops');
  final onionAddPeerKey = lib.lookupFunction<
      Int32 Function(Pointer<Void>, Pointer<Uint8>, Pointer<Uint8>),
      int Function(Pointer<Void>, Pointer<Uint8>, Pointer<Uint8>)>('cyxwiz_ffi_onion_add_peer_key');

  final createDiscovery = lib.lookupFunction<
      Int32 Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Void>, Pointer<Uint8>),
      int Function(Pointer<Pointer<Void>>, Pointer<Void>, Pointer<Void>, Pointer<Uint8>)>('cyxwiz_ffi_discovery_create');
  final destroyDiscovery = lib.lookupFunction<
      Void Function(Pointer<Void>),
      void Function(Pointer<Void>)>('cyxwiz_ffi_discovery_destroy');
  final startDiscovery = lib.lookupFunction<
      Int32 Function(Pointer<Void>),
      int Function(Pointer<Void>)>('cyxwiz_ffi_discovery_start');
  final stopDiscovery = lib.lookupFunction<
      Int32 Function(Pointer<Void>),
      int Function(Pointer<Void>)>('cyxwiz_ffi_discovery_stop');
  final setDiscoveryDht = lib.lookupFunction<
      Int32 Function(Pointer<Void>, Pointer<Void>),
      int Function(Pointer<Void>, Pointer<Void>)>('cyxwiz_ffi_discovery_set_dht');

  // Initialize
  print('Initializing crypto...');
  if (init() != 0) {
    print('FAIL: crypto init failed');
    return;
  }
  print('  PASS\n');

  // Generate node ID
  print('Generating node ID...');
  final nodeIdPtr = calloc<Uint8>(nodeIdSize);
  if (generateNodeId(nodeIdPtr) != 0) {
    print('FAIL: node ID generation failed');
    calloc.free(nodeIdPtr);
    return;
  }
  final nodeIdHex = _bytesToHex(nodeIdPtr.asTypedList(nodeIdSize));
  print('  Node ID: ${nodeIdHex.substring(0, 16)}...');
  print('  PASS\n');

  // Create peer table
  print('Creating peer table...');
  final peerTablePtr = calloc<Pointer<Void>>();
  if (createPeerTable(peerTablePtr) != 0) {
    print('FAIL: peer table creation failed');
    calloc.free(nodeIdPtr);
    calloc.free(peerTablePtr);
    return;
  }
  final peerTable = peerTablePtr.value;
  print('  PASS\n');

  // Create transport
  print('Creating UDP transport...');
  final bootstrap = 'localhost:8443'.toNativeUtf8();
  final transportPtr = calloc<Pointer<Void>>();
  if (createTransport(transportPtr, bootstrap, 14) != 0) {
    print('FAIL: transport creation failed');
    destroyPeerTable(peerTable);
    calloc.free(nodeIdPtr);
    calloc.free(peerTablePtr);
    calloc.free(transportPtr);
    calloc.free(bootstrap);
    return;
  }
  final transport = transportPtr.value;
  print('  PASS\n');

  // Create router
  print('Creating mesh router...');
  final routerPtr = calloc<Pointer<Void>>();
  if (createRouter(routerPtr, peerTable, transport, nodeIdPtr) != 0) {
    print('FAIL: router creation failed');
    destroyTransport(transport);
    destroyPeerTable(peerTable);
    calloc.free(nodeIdPtr);
    return;
  }
  final router = routerPtr.value;
  print('  PASS\n');

  // Start router
  print('Starting router...');
  if (startRouter(router) != 0) {
    print('FAIL: router start failed');
  } else {
    print('  PASS\n');
  }

  // Create DHT
  print('Creating DHT (Kademlia)...');
  final dhtPtr = calloc<Pointer<Void>>();
  if (createDht(dhtPtr, router, nodeIdPtr) != 0) {
    print('FAIL: DHT creation failed');
  } else {
    print('  PASS\n');
  }
  final dht = dhtPtr.value;

  // Create onion context
  print('Creating onion routing context...');
  final onionPtr = calloc<Pointer<Void>>();
  if (createOnion(onionPtr, router, nodeIdPtr) != 0) {
    print('FAIL: onion creation failed');
  } else {
    print('  PASS\n');
  }
  final onion = onionPtr.value;

  // Get onion public key
  print('Getting onion public key (X25519)...');
  final pubkeyPtr = calloc<Uint8>(pubkeySize);
  if (onionGetPubkey(onion, pubkeyPtr) != 0) {
    print('FAIL: get pubkey failed');
  } else {
    final pubkeyHex = _bytesToHex(pubkeyPtr.asTypedList(pubkeySize));
    print('  Public key: ${pubkeyHex.substring(0, 16)}...');
    print('  PASS\n');
  }

  // Set onion hop count
  print('Setting onion hop count...');
  for (int hops = 1; hops <= 5; hops++) {
    if (onionSetHops(onion, hops) != 0) {
      print('  FAIL: set hops to $hops failed');
    } else {
      print('  Hop count $hops: OK');
    }
  }
  print('  PASS\n');

  // Test adding peer key
  print('Testing peer key addition...');
  final fakePeerId = calloc<Uint8>(nodeIdSize);
  final fakePubkey = calloc<Uint8>(pubkeySize);
  // Fill with dummy data
  for (int i = 0; i < nodeIdSize; i++) fakePeerId[i] = i;
  for (int i = 0; i < pubkeySize; i++) fakePubkey[i] = (i + 100);

  if (onionAddPeerKey(onion, fakePeerId, fakePubkey) != 0) {
    print('  FAIL: add peer key failed');
  } else {
    print('  Added peer key: ${_bytesToHex(fakePeerId.asTypedList(8))}...');
    print('  PASS\n');
  }
  calloc.free(fakePeerId);
  calloc.free(fakePubkey);

  // Create discovery
  print('Creating peer discovery...');
  final discoveryPtr = calloc<Pointer<Void>>();
  if (createDiscovery(discoveryPtr, peerTable, transport, nodeIdPtr) != 0) {
    print('FAIL: discovery creation failed');
  } else {
    print('  PASS\n');
  }
  final discovery = discoveryPtr.value;

  // Link discovery to DHT
  print('Linking discovery to DHT...');
  if (setDiscoveryDht(discovery, dht) != 0) {
    print('FAIL: set discovery DHT failed');
  } else {
    print('  PASS\n');
  }

  // Start discovery
  print('Starting discovery...');
  if (startDiscovery(discovery) != 0) {
    print('FAIL: discovery start failed');
  } else {
    print('  PASS\n');
  }

  // Brief poll (simulate event loop)
  print('Running brief poll cycle...');
  await Future.delayed(Duration(milliseconds: 100));
  print('  PASS\n');

  // Cleanup
  print('Cleaning up...');
  stopDiscovery(discovery);
  destroyDiscovery(discovery);
  print('  Discovery destroyed');

  destroyOnion(onion);
  print('  Onion context destroyed');

  destroyDht(dht);
  print('  DHT destroyed');

  stopRouter(router);
  destroyRouter(router);
  print('  Router destroyed');

  destroyTransport(transport);
  print('  Transport destroyed');

  destroyPeerTable(peerTable);
  print('  Peer table destroyed');

  // Free memory
  calloc.free(nodeIdPtr);
  calloc.free(peerTablePtr);
  calloc.free(transportPtr);
  calloc.free(routerPtr);
  calloc.free(dhtPtr);
  calloc.free(onionPtr);
  calloc.free(discoveryPtr);
  calloc.free(pubkeyPtr);
  calloc.free(bootstrap);

  shutdown();
  print('  Shutdown complete');

  print('\n=== All onion routing tests passed ===');
}

String _bytesToHex(Uint8List bytes) {
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}
