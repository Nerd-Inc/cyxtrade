import { query, queryOne, transaction } from './db';
import { AppError, ErrorCode } from '../utils/errors';

export interface P2PMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'system' | 'payment_proof';
  content: string | null;
  image_url: string | null;
  read_at: Date | null;
  created_at: Date;
  // Joined fields
  sender_display_name?: string;
  sender_avatar_url?: string;
}

export interface SendMessageDTO {
  order_id: string;
  message_type?: 'text' | 'image' | 'payment_proof';
  content?: string;
  image_url?: string;
}

// ============================================
// Message Operations
// ============================================

export async function sendMessage(
  senderId: string,
  data: SendMessageDTO
): Promise<P2PMessage> {
  // Verify sender is participant in the order
  const orderResult = await query(
    `SELECT o.user_id, t.user_id as trader_user_id
     FROM orders o
     JOIN traders t ON o.trader_id = t.id
     WHERE o.id = $1`,
    [data.order_id]
  );

  if (!orderResult[0]) {
    throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
  }

  const order = orderResult[0] as { user_id: string; trader_user_id: string };
  if (order.user_id !== senderId && order.trader_user_id !== senderId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to send messages in this order');
  }

  // Validate message content
  const messageType = data.message_type || 'text';
  if (messageType === 'text' && !data.content) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Content is required for text messages');
  }
  if ((messageType === 'image' || messageType === 'payment_proof') && !data.image_url) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Image URL is required for image messages');
  }

  const rows = await query<P2PMessage>(
    `INSERT INTO messages (order_id, sender_id, message_type, content, image_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.order_id,
      senderId,
      messageType,
      data.content || null,
      data.image_url || null,
    ]
  );

  const message = rows[0];

  // Get sender info
  const senderResult = await queryOne<{ display_name: string; avatar_url: string }>(
    'SELECT display_name, avatar_url FROM users WHERE id = $1',
    [senderId]
  );
  if (senderResult) {
    message.sender_display_name = senderResult.display_name;
    message.sender_avatar_url = senderResult.avatar_url;
  }

  return message;
}

export async function sendSystemMessage(
  orderId: string,
  content: string
): Promise<P2PMessage> {
  const rows = await query<P2PMessage>(
    `INSERT INTO messages (order_id, sender_id, message_type, content)
     VALUES ($1, $1, 'system', $2)
     RETURNING *`,
    [orderId, content]
  );
  return rows[0];
}

export async function getOrderMessages(
  orderId: string,
  userId: string,
  options: { limit?: number; before?: string }
): Promise<P2PMessage[]> {
  // Verify user is participant
  const orderResult = await query(
    `SELECT o.user_id, t.user_id as trader_user_id
     FROM orders o
     JOIN traders t ON o.trader_id = t.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!orderResult[0]) {
    throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found');
  }

  const order = orderResult[0] as { user_id: string; trader_user_id: string };
  if (order.user_id !== userId && order.trader_user_id !== userId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authorized to view messages');
  }

  const conditions: string[] = ['m.order_id = $1'];
  const values: any[] = [orderId];
  let paramIndex = 2;

  if (options.before) {
    conditions.push(`m.created_at < (SELECT created_at FROM messages WHERE id = $${paramIndex++})`);
    values.push(options.before);
  }

  const limit = options.limit || 50;

  const messages = await query<P2PMessage>(
    `SELECT m.*, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url
     FROM messages m
     LEFT JOIN users u ON m.sender_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY m.created_at DESC
     LIMIT $${paramIndex}`,
    [...values, limit]
  );

  return messages.reverse(); // Return in chronological order
}

export async function markMessagesAsRead(
  orderId: string,
  userId: string
): Promise<number> {
  // Verify user is participant
  const orderResult = await query(
    `SELECT o.user_id, t.user_id as trader_user_id
     FROM orders o
     JOIN traders t ON o.trader_id = t.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (!orderResult[0]) {
    return 0;
  }

  const order = orderResult[0] as { user_id: string; trader_user_id: string };
  if (order.user_id !== userId && order.trader_user_id !== userId) {
    return 0;
  }

  const result = await query(
    `UPDATE messages
     SET is_read = true, read_at = NOW()
     WHERE order_id = $1 AND sender_id != $2 AND is_read = false`,
    [orderId, userId]
  );

  return (result as any).rowCount || 0;
}

export async function getUnreadCount(orderId: string, userId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM messages
     WHERE order_id = $1 AND sender_id != $2 AND is_read = false`,
    [orderId, userId]
  );
  return parseInt(result?.count || '0', 10);
}

export async function getTotalUnreadCount(userId: string): Promise<number> {
  // Get unread messages across all orders where user is participant
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM messages m
     JOIN orders o ON m.order_id = o.id
     JOIN traders t ON o.trader_id = t.id
     WHERE (o.user_id = $1 OR t.user_id = $1)
       AND m.sender_id != $1
       AND m.is_read = false
       AND o.status NOT IN ('completed', 'cancelled', 'expired')`,
    [userId]
  );
  return parseInt(result?.count || '0', 10);
}

// ============================================
// Conversation List
// ============================================

export interface OrderConversation {
  order_id: string;
  order_number: string;
  order_status: string;
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar: string | null;
  last_message: string | null;
  last_message_type: string;
  last_message_at: Date;
  unread_count: number;
  total_fiat: number;
  fiat_currency: string;
  type: 'buy' | 'sell';
}

export async function getConversations(
  userId: string,
  options: { limit?: number; offset?: number }
): Promise<OrderConversation[]> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const conversations = await query<OrderConversation>(
    `WITH order_messages AS (
      SELECT DISTINCT ON (o.id)
        o.id as order_id,
        o.order_number,
        o.status as order_status,
        o.send_amount as total_fiat,
        o.send_currency as fiat_currency,
        o.type,
        CASE
          WHEN o.user_id = $1 THEN t_user.id
          ELSE o.user_id
        END as counterparty_id,
        CASE
          WHEN o.user_id = $1 THEN t_user.display_name
          ELSE u.display_name
        END as counterparty_name,
        CASE
          WHEN o.user_id = $1 THEN t_user.avatar_url
          ELSE u.avatar_url
        END as counterparty_avatar,
        m.content as last_message,
        m.message_type as last_message_type,
        COALESCE(m.created_at, o.created_at) as last_message_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN traders t ON o.trader_id = t.id
      JOIN users t_user ON t.user_id = t_user.id
      LEFT JOIN messages m ON m.order_id = o.id
      WHERE (o.user_id = $1 OR t.user_id = $1)
        AND o.status NOT IN ('expired')
      ORDER BY o.id, m.created_at DESC
    ),
    unread_counts AS (
      SELECT o.id as order_id, COUNT(m.id) as unread_count
      FROM orders o
      JOIN traders t ON o.trader_id = t.id
      LEFT JOIN messages m ON m.order_id = o.id
        AND m.sender_id != $1
        AND m.is_read = false
      WHERE (o.user_id = $1 OR t.user_id = $1)
      GROUP BY o.id
    )
    SELECT om.*, COALESCE(uc.unread_count, 0) as unread_count
    FROM order_messages om
    LEFT JOIN unread_counts uc ON om.order_id = uc.order_id
    ORDER BY om.last_message_at DESC
    LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return conversations;
}
