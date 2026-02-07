import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// In-memory message store for development
const messageStore = new Map<string, any[]>();

// GET /api/chat/trades/:tradeId/messages - Get chat messages for trade
router.get('/trades/:tradeId/messages', async (req: AuthRequest, res) => {
  try {
    const tradeId = req.params.tradeId as string;

    // Get messages from memory store
    const messages = messageStore.get(tradeId) || [];

    res.json({
      messages,
      hasMore: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /api/chat/trades/:tradeId/messages - Send message
router.post('/trades/:tradeId/messages', async (req: AuthRequest, res) => {
  try {
    const tradeId = req.params.tradeId as string;
    const { content, messageType = 'text' } = req.body;

    if (!content && messageType === 'text') {
      return res.status(400).json({ error: 'Message content required' });
    }

    const message = {
      id: uuidv4(),
      tradeId,
      senderId: req.user?.id,
      messageType,
      content,
      createdAt: new Date().toISOString()
    };

    // Store message in memory
    if (!messageStore.has(tradeId)) {
      messageStore.set(tradeId, []);
    }
    messageStore.get(tradeId)!.push(message);

    // TODO: Emit socket event to other party

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/chat/trades/:tradeId/messages/image - Upload image
router.post('/trades/:tradeId/messages/image', async (req: AuthRequest, res) => {
  try {
    const tradeId = req.params.tradeId as string;

    // TODO: Handle file upload to S3
    // TODO: Create message with image URL
    res.json({
      id: 'msg_' + Date.now(),
      tradeId,
      senderId: req.user?.id,
      messageType: 'image',
      imageUrl: 'https://placeholder.com/image.jpg',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// PUT /api/chat/trades/:tradeId/messages/read - Mark messages as read
router.put('/trades/:tradeId/messages/read', async (req: AuthRequest, res) => {
  try {
    const tradeId = req.params.tradeId as string;

    // TODO: Mark all messages as read
    // TODO: Emit socket event
    res.json({
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// POST /api/chat/trades/:tradeId/typing - Send typing indicator
router.post('/trades/:tradeId/typing', async (req: AuthRequest, res) => {
  try {
    const tradeId = req.params.tradeId as string;

    // TODO: Emit typing event via socket
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

export default router;
