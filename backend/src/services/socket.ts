import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    phone: string;
    isTrader: boolean;
  };
}

export function setupSocketHandlers(io: Server) {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
        id: string;
        phone: string;
        isTrader: boolean;
      };

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 User connected: ${socket.user?.id}`);

    // Join user's personal room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Join trade room
    socket.on('trade:join', (tradeId: string) => {
      socket.join(`trade:${tradeId}`);
      console.log(`User ${socket.user?.id} joined trade room: ${tradeId}`);
    });

    // Leave trade room
    socket.on('trade:leave', (tradeId: string) => {
      socket.leave(`trade:${tradeId}`);
    });

    // Chat message
    socket.on('chat:message', (data: { tradeId: string; content: string }) => {
      const message = {
        id: 'msg_' + Date.now(),
        tradeId: data.tradeId,
        senderId: socket.user?.id,
        content: data.content,
        createdAt: new Date().toISOString()
      };

      // Broadcast to trade room
      io.to(`trade:${data.tradeId}`).emit('chat:message', message);
    });

    // Typing indicator
    socket.on('chat:typing', (data: { tradeId: string }) => {
      socket.to(`trade:${data.tradeId}`).emit('chat:typing', {
        userId: socket.user?.id,
        tradeId: data.tradeId
      });
    });

    // Read receipt
    socket.on('chat:read', (data: { tradeId: string }) => {
      socket.to(`trade:${data.tradeId}`).emit('chat:read', {
        userId: socket.user?.id,
        tradeId: data.tradeId
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user?.id}`);
    });
  });

  console.log('🔌 WebSocket handlers initialized');
}

// Helper to emit events to specific users
export function emitToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

// Helper to emit events to trade participants
export function emitToTrade(io: Server, tradeId: string, event: string, data: any) {
  io.to(`trade:${tradeId}`).emit(event, data);
}
