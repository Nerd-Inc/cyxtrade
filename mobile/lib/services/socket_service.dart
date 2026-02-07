import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'storage_service.dart';
import '../config/api.dart';

class SocketService extends ChangeNotifier {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  String? _currentTradeRoom;

  bool get isConnected => _isConnected;

  // Callbacks for different events
  final List<Function(Map<String, dynamic>)> _messageListeners = [];
  final List<Function(Map<String, dynamic>)> _typingListeners = [];
  final List<Function(Map<String, dynamic>)> _readListeners = [];
  final List<Function(Map<String, dynamic>)> _tradeUpdateListeners = [];
  final List<Function(Map<String, dynamic>)> _notificationListeners = [];

  Future<void> connect() async {
    if (_socket != null && _isConnected) return;

    final token = await StorageService().getToken();
    if (token == null) {
      debugPrint('SocketService: No token, cannot connect');
      return;
    }

    final baseUrl = ApiConfig.baseUrl.replaceAll('/api', '');

    _socket = IO.io(
      baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build(),
    );

    _setupListeners();
  }

  void _setupListeners() {
    _socket?.onConnect((_) {
      debugPrint('SocketService: Connected');
      _isConnected = true;
      notifyListeners();
    });

    _socket?.onDisconnect((_) {
      debugPrint('SocketService: Disconnected');
      _isConnected = false;
      notifyListeners();
    });

    _socket?.onConnectError((error) {
      debugPrint('SocketService: Connection error: $error');
      _isConnected = false;
      notifyListeners();
    });

    _socket?.onError((error) {
      debugPrint('SocketService: Error: $error');
    });

    // Chat message received
    _socket?.on('chat:message', (data) {
      debugPrint('SocketService: Message received: $data');
      final message = Map<String, dynamic>.from(data);
      for (final listener in _messageListeners) {
        listener(message);
      }
    });

    // Typing indicator
    _socket?.on('chat:typing', (data) {
      final typing = Map<String, dynamic>.from(data);
      for (final listener in _typingListeners) {
        listener(typing);
      }
    });

    // Read receipt
    _socket?.on('chat:read', (data) {
      final read = Map<String, dynamic>.from(data);
      for (final listener in _readListeners) {
        listener(read);
      }
    });

    // Trade status update
    _socket?.on('trade:update', (data) {
      debugPrint('SocketService: Trade update: $data');
      final update = Map<String, dynamic>.from(data);
      for (final listener in _tradeUpdateListeners) {
        listener(update);
      }
    });

    // Notification
    _socket?.on('notification', (data) {
      debugPrint('SocketService: Notification: $data');
      final notification = Map<String, dynamic>.from(data);
      for (final listener in _notificationListeners) {
        listener(notification);
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _currentTradeRoom = null;
    notifyListeners();
  }

  // Join a trade room for real-time updates
  void joinTradeRoom(String tradeId) {
    if (_currentTradeRoom == tradeId) return;

    // Leave previous room
    if (_currentTradeRoom != null) {
      leaveTradeRoom(_currentTradeRoom!);
    }

    _socket?.emit('trade:join', tradeId);
    _currentTradeRoom = tradeId;
    debugPrint('SocketService: Joined trade room: $tradeId');
  }

  // Leave trade room
  void leaveTradeRoom(String tradeId) {
    _socket?.emit('trade:leave', tradeId);
    if (_currentTradeRoom == tradeId) {
      _currentTradeRoom = null;
    }
    debugPrint('SocketService: Left trade room: $tradeId');
  }

  // Send chat message
  void sendMessage(String tradeId, String content) {
    _socket?.emit('chat:message', {
      'tradeId': tradeId,
      'content': content,
    });
  }

  // Send typing indicator
  void sendTyping(String tradeId) {
    _socket?.emit('chat:typing', {
      'tradeId': tradeId,
    });
  }

  // Send read receipt
  void sendRead(String tradeId) {
    _socket?.emit('chat:read', {
      'tradeId': tradeId,
    });
  }

  // Register message listener
  void addMessageListener(Function(Map<String, dynamic>) listener) {
    _messageListeners.add(listener);
  }

  void removeMessageListener(Function(Map<String, dynamic>) listener) {
    _messageListeners.remove(listener);
  }

  // Register typing listener
  void addTypingListener(Function(Map<String, dynamic>) listener) {
    _typingListeners.add(listener);
  }

  void removeTypingListener(Function(Map<String, dynamic>) listener) {
    _typingListeners.remove(listener);
  }

  // Register read listener
  void addReadListener(Function(Map<String, dynamic>) listener) {
    _readListeners.add(listener);
  }

  void removeReadListener(Function(Map<String, dynamic>) listener) {
    _readListeners.remove(listener);
  }

  // Register trade update listener
  void addTradeUpdateListener(Function(Map<String, dynamic>) listener) {
    _tradeUpdateListeners.add(listener);
  }

  void removeTradeUpdateListener(Function(Map<String, dynamic>) listener) {
    _tradeUpdateListeners.remove(listener);
  }

  // Register notification listener
  void addNotificationListener(Function(Map<String, dynamic>) listener) {
    _notificationListeners.add(listener);
  }

  void removeNotificationListener(Function(Map<String, dynamic>) listener) {
    _notificationListeners.remove(listener);
  }
}
