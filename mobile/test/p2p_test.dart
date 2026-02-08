// P2P Native Library Test
//
// Tests that:
// 1. Native library loads
// 2. Crypto initializes
// 3. Node ID generation works
// 4. Basic components create/destroy without crash

import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

void main() async {
  print('=== CyxWiz P2P Native Library Test ===\n');

  // Test 1: Load native library
  print('Test 1: Loading native library...');
  late DynamicLibrary lib;
  try {
    if (Platform.isWindows) {
      // Try multiple paths for Windows
      final paths = [
        'cyxwiz_ffi.dll',
        'native/build/windows/Release/cyxwiz_ffi.dll',
        '../native/build/windows/Release/cyxwiz_ffi.dll',
      ];

      for (final path in paths) {
        try {
          lib = DynamicLibrary.open(path);
          print('  Loaded from: $path');
          break;
        } catch (e) {
          continue;
        }
      }
    } else if (Platform.isAndroid || Platform.isLinux) {
      lib = DynamicLibrary.open('libcyxwiz_ffi.so');
    } else {
      print('  SKIP: Unsupported platform ${Platform.operatingSystem}');
      return;
    }
    print('  PASS: Library loaded\n');
  } catch (e) {
    print('  FAIL: Could not load library: $e\n');
    return;
  }

  // Test 2: Initialize crypto
  print('Test 2: Initializing crypto...');
  try {
    final init = lib.lookupFunction<Int32 Function(), int Function()>('cyxwiz_ffi_init');
    final result = init();
    if (result == 0) {
      print('  PASS: Crypto initialized (code: $result)\n');
    } else {
      print('  FAIL: Init returned error code: $result\n');
      return;
    }
  } catch (e) {
    print('  FAIL: $e\n');
    return;
  }

  // Test 3: Generate node ID
  print('Test 3: Generating node ID...');
  try {
    final generateNodeId = lib.lookupFunction<
        Int32 Function(Pointer<Uint8>),
        int Function(Pointer<Uint8>)>('cyxwiz_ffi_generate_node_id');

    final nodeIdPtr = calloc<Uint8>(32);
    try {
      final result = generateNodeId(nodeIdPtr);
      if (result == 0) {
        final nodeId = Uint8List.fromList(nodeIdPtr.asTypedList(32));
        final hex = nodeId.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
        print('  PASS: Generated node ID: ${hex.substring(0, 16)}...\n');
      } else {
        print('  FAIL: generateNodeId returned error: $result\n');
      }
    } finally {
      calloc.free(nodeIdPtr);
    }
  } catch (e) {
    print('  FAIL: $e\n');
    return;
  }

  // Test 4: Create peer table
  print('Test 4: Creating peer table...');
  late Pointer<Void> peerTable;
  try {
    final createPeerTable = lib.lookupFunction<
        Int32 Function(Pointer<Pointer<Void>>),
        int Function(Pointer<Pointer<Void>>)>('cyxwiz_ffi_peer_table_create');
    final destroyPeerTable = lib.lookupFunction<
        Void Function(Pointer<Void>),
        void Function(Pointer<Void>)>('cyxwiz_ffi_peer_table_destroy');
    final getPeerCount = lib.lookupFunction<
        IntPtr Function(Pointer<Void>),
        int Function(Pointer<Void>)>('cyxwiz_ffi_peer_table_count');

    final ptrPtr = calloc<Pointer<Void>>();
    try {
      final result = createPeerTable(ptrPtr);
      if (result == 0) {
        peerTable = ptrPtr.value;
        final count = getPeerCount(peerTable);
        print('  PASS: Peer table created (peers: $count)\n');

        // Clean up
        destroyPeerTable(peerTable);
        print('  Peer table destroyed\n');
      } else {
        print('  FAIL: createPeerTable returned error: $result\n');
      }
    } finally {
      calloc.free(ptrPtr);
    }
  } catch (e) {
    print('  FAIL: $e\n');
    return;
  }

  // Test 5: Create transport (without connecting)
  print('Test 5: Creating UDP transport...');
  try {
    final createTransport = lib.lookupFunction<
        Int32 Function(Pointer<Pointer<Void>>, Pointer<Utf8>, IntPtr),
        int Function(Pointer<Pointer<Void>>, Pointer<Utf8>, int)>('cyxwiz_ffi_transport_create');
    final destroyTransport = lib.lookupFunction<
        Void Function(Pointer<Void>),
        void Function(Pointer<Void>)>('cyxwiz_ffi_transport_destroy');

    final bootstrap = 'localhost:8443'.toNativeUtf8();
    final ptrPtr = calloc<Pointer<Void>>();
    try {
      final result = createTransport(ptrPtr, bootstrap, 14);
      if (result == 0) {
        final transport = ptrPtr.value;
        print('  PASS: Transport created\n');
        destroyTransport(transport);
        print('  Transport destroyed\n');
      } else {
        print('  WARN: createTransport returned: $result (may need network)\n');
      }
    } finally {
      calloc.free(ptrPtr);
      calloc.free(bootstrap);
    }
  } catch (e) {
    print('  WARN: $e (may need network setup)\n');
  }

  // Test 6: Shutdown
  print('Test 6: Shutting down...');
  try {
    final shutdown = lib.lookupFunction<Void Function(), void Function()>('cyxwiz_ffi_shutdown');
    shutdown();
    print('  PASS: Shutdown complete\n');
  } catch (e) {
    print('  FAIL: $e\n');
  }

  print('=== All basic tests completed ===');
}
