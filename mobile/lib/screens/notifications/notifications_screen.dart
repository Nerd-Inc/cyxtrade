import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  // Mock notifications for development
  final List<Map<String, dynamic>> _notifications = [
    {
      'id': '1',
      'type': 'trade_accepted',
      'title': 'Trade Accepted',
      'message': 'Mamadou Diallo accepted your trade request',
      'tradeId': 'trade-001',
      'read': false,
      'createdAt': DateTime.now().subtract(const Duration(minutes: 5)),
    },
    {
      'id': '2',
      'type': 'payment_reminder',
      'title': 'Payment Reminder',
      'message': 'Please send payment for your trade within 30 minutes',
      'tradeId': 'trade-001',
      'read': false,
      'createdAt': DateTime.now().subtract(const Duration(hours: 1)),
    },
    {
      'id': '3',
      'type': 'trade_completed',
      'title': 'Trade Completed',
      'message': 'Your transfer to Marie has been completed',
      'tradeId': 'trade-002',
      'read': true,
      'createdAt': DateTime.now().subtract(const Duration(days: 1)),
    },
    {
      'id': '4',
      'type': 'new_message',
      'title': 'New Message',
      'message': 'Ibrahim Sow sent you a message',
      'tradeId': 'trade-003',
      'read': true,
      'createdAt': DateTime.now().subtract(const Duration(days: 2)),
    },
  ];

  void _markAsRead(String id) {
    setState(() {
      final index = _notifications.indexWhere((n) => n['id'] == id);
      if (index != -1) {
        _notifications[index]['read'] = true;
      }
    });
  }

  void _markAllAsRead() {
    setState(() {
      for (var notification in _notifications) {
        notification['read'] = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => !n['read']).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: _notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No notifications',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You\'re all caught up!',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                return _NotificationItem(
                  notification: notification,
                  onTap: () {
                    _markAsRead(notification['id']);
                    if (notification['tradeId'] != null) {
                      context.push('/trade/${notification['tradeId']}');
                    }
                  },
                );
              },
            ),
    );
  }
}

class _NotificationItem extends StatelessWidget {
  final Map<String, dynamic> notification;
  final VoidCallback onTap;

  const _NotificationItem({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isRead = notification['read'] as bool;
    final createdAt = notification['createdAt'] as DateTime;
    final type = notification['type'] as String;

    return Container(
      color: isRead ? null : Colors.blue.shade50,
      child: ListTile(
        leading: _NotificationIcon(type: type),
        title: Text(
          notification['title'],
          style: TextStyle(
            fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              notification['message'],
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(createdAt),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
        trailing: !isRead
            ? Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: Colors.blue,
                  shape: BoxShape.circle,
                ),
              )
            : null,
        onTap: onTap,
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);

    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${time.day}/${time.month}/${time.year}';
    }
  }
}

class _NotificationIcon extends StatelessWidget {
  final String type;

  const _NotificationIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (type) {
      case 'trade_accepted':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'trade_completed':
        icon = Icons.done_all;
        color = Colors.green;
        break;
      case 'payment_reminder':
        icon = Icons.access_time;
        color = Colors.orange;
        break;
      case 'new_message':
        icon = Icons.chat_bubble;
        color = Colors.blue;
        break;
      case 'trade_disputed':
        icon = Icons.warning;
        color = Colors.red;
        break;
      default:
        icon = Icons.notifications;
        color = Colors.grey;
    }

    return CircleAvatar(
      backgroundColor: color.withOpacity(0.1),
      child: Icon(icon, color: color, size: 20),
    );
  }
}
