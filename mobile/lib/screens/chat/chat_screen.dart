import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';

class ChatScreen extends StatefulWidget {
  final String tradeId;
  final String traderName;

  const ChatScreen({
    super.key,
    required this.tradeId,
    required this.traderName,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  final SocketService _socketService = SocketService();

  bool _isLoading = true;
  bool _isSending = false;
  bool _isTyping = false;
  String? _typingUser;
  Timer? _typingTimer;

  @override
  void initState() {
    super.initState();
    _initSocket();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMessages();
    });
  }

  void _initSocket() {
    // Connect and join trade room
    _socketService.connect().then((_) {
      _socketService.joinTradeRoom(widget.tradeId);
    });

    // Listen for incoming messages
    _socketService.addMessageListener(_onMessageReceived);
    _socketService.addTypingListener(_onTypingReceived);
    _socketService.addReadListener(_onReadReceived);
  }

  void _onMessageReceived(Map<String, dynamic> message) {
    if (message['tradeId'] != widget.tradeId) return;

    final userId = context.read<AuthProvider>().user?['id'];
    // Don't add our own messages (already added optimistically)
    if (message['senderId'] == userId) return;

    setState(() {
      _messages.add(message);
      _isTyping = false;
      _typingUser = null;
    });
    _scrollToBottom();

    // Send read receipt
    _socketService.sendRead(widget.tradeId);
  }

  void _onTypingReceived(Map<String, dynamic> data) {
    if (data['tradeId'] != widget.tradeId) return;

    final userId = context.read<AuthProvider>().user?['id'];
    if (data['userId'] == userId) return;

    setState(() {
      _isTyping = true;
      _typingUser = data['userId'];
    });

    // Clear typing after 3 seconds
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _isTyping = false;
          _typingUser = null;
        });
      }
    });
  }

  void _onReadReceived(Map<String, dynamic> data) {
    // Could update message read status here
    debugPrint('Read receipt: $data');
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();

    // Leave room and remove listeners
    _socketService.leaveTradeRoom(widget.tradeId);
    _socketService.removeMessageListener(_onMessageReceived);
    _socketService.removeTypingListener(_onTypingReceived);
    _socketService.removeReadListener(_onReadReceived);

    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().getChatMessages(widget.tradeId);
      setState(() {
        _messages.clear();
        _messages.addAll(List<Map<String, dynamic>>.from(response['messages'] ?? []));
      });
      _scrollToBottom();

      // Send read receipt for loaded messages
      _socketService.sendRead(widget.tradeId);
    } catch (e) {
      // Use mock messages for development
      setState(() {
        _messages.addAll([
          {
            'id': '1',
            'senderId': 'trader',
            'content': 'Hello! I\'ve received your trade request.',
            'createdAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          },
          {
            'id': '2',
            'senderId': 'trader',
            'content': 'Please send payment to my bank account and share the receipt here.',
            'createdAt': DateTime.now().subtract(const Duration(minutes: 4)).toIso8601String(),
          },
        ]);
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _onTextChanged(String text) {
    // Send typing indicator (debounced)
    if (text.isNotEmpty) {
      _socketService.sendTyping(widget.tradeId);
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSending = true);
    _messageController.clear();

    final userId = context.read<AuthProvider>().user?['id'] ?? 'user';

    // Add message optimistically
    final newMessage = {
      'id': 'msg_${DateTime.now().millisecondsSinceEpoch}',
      'senderId': userId,
      'content': text,
      'createdAt': DateTime.now().toIso8601String(),
    };

    setState(() {
      _messages.add(newMessage);
    });
    _scrollToBottom();

    // Send via socket (real-time)
    _socketService.sendMessage(widget.tradeId, text);

    // Also send via API (persistence)
    try {
      await ApiService().sendMessage(widget.tradeId, text);
    } catch (e) {
      debugPrint('Failed to persist message: $e');
    } finally {
      setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthProvider>().user?['id'] ?? 'user';

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
              child: Text(
                widget.traderName[0].toUpperCase(),
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.traderName,
                    style: const TextStyle(fontSize: 16),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _socketService.isConnected ? Colors.green : Colors.grey,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isTyping ? 'typing...' : (_socketService.isConnected ? 'Online' : 'Connecting...'),
                        style: TextStyle(
                          fontSize: 12,
                          color: _isTyping ? Theme.of(context).primaryColor : Colors.grey.shade600,
                          fontStyle: _isTyping ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                builder: (context) => _ChatOptionsSheet(tradeId: widget.tradeId),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Trade info banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.blue.shade50,
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Trade #${widget.tradeId.substring(0, 8).toUpperCase()}',
                    style: TextStyle(color: Colors.blue.shade700, fontSize: 13),
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/trade/${widget.tradeId}'),
                  child: const Text('View'),
                ),
              ],
            ),
          ),
          // Messages
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.chat_bubble_outline,
                                size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            Text(
                              'No messages yet',
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 8),
                            const Text('Start the conversation!'),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length + (_isTyping ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_isTyping && index == _messages.length) {
                            return _TypingIndicator(traderName: widget.traderName);
                          }
                          final message = _messages[index];
                          final isMe = message['senderId'] == userId;
                          return _MessageBubble(
                            message: message,
                            isMe: isMe,
                            traderName: widget.traderName,
                          );
                        },
                      ),
          ),
          // Input
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Attachments coming soon')),
                      );
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      onChanged: _onTextChanged,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor,
                    child: IconButton(
                      icon: _isSending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send, color: Colors.white),
                      onPressed: _isSending ? null : _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  final String traderName;

  const _TypingIndicator({required this.traderName});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey.shade200,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _DotAnimation(),
            const SizedBox(width: 4),
            _DotAnimation(delay: 150),
            const SizedBox(width: 4),
            _DotAnimation(delay: 300),
          ],
        ),
      ),
    );
  }
}

class _DotAnimation extends StatefulWidget {
  final int delay;

  const _DotAnimation({this.delay = 0});

  @override
  State<_DotAnimation> createState() => _DotAnimationState();
}

class _DotAnimationState extends State<_DotAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) {
        _controller.repeat(reverse: true);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -4 * _animation.value),
          child: Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: Colors.grey.shade500,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> message;
  final bool isMe;
  final String traderName;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    required this.traderName,
  });

  @override
  Widget build(BuildContext context) {
    final timestamp = DateTime.tryParse(message['createdAt'] ?? message['timestamp'] ?? '') ?? DateTime.now();
    final timeStr = '${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}';

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe)
              Padding(
                padding: const EdgeInsets.only(left: 12, bottom: 4),
                child: Text(
                  traderName,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? Theme.of(context).primaryColor : Colors.grey.shade200,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
              ),
              child: Text(
                message['content'] ?? '',
                style: TextStyle(
                  color: isMe ? Colors.white : Colors.black87,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    timeStr,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                    ),
                  ),
                  if (isMe) ...[
                    const SizedBox(width: 4),
                    Icon(
                      Icons.done_all,
                      size: 14,
                      color: Colors.grey.shade400,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatOptionsSheet extends StatelessWidget {
  final String tradeId;

  const _ChatOptionsSheet({required this.tradeId});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.receipt_long),
            title: const Text('View Trade Details'),
            onTap: () {
              Navigator.pop(context);
              context.push('/trade/$tradeId');
            },
          ),
          ListTile(
            leading: const Icon(Icons.flag_outlined),
            title: const Text('Report Issue'),
            onTap: () {
              Navigator.pop(context);
              context.push('/dispute/$tradeId');
            },
          ),
          ListTile(
            leading: Icon(Icons.block, color: Colors.red.shade400),
            title: Text('Block Trader', style: TextStyle(color: Colors.red.shade400)),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Block feature coming soon')),
              );
            },
          ),
        ],
      ),
    );
  }
}
