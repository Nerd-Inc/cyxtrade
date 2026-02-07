import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import traderRoutes from './routes/traders';
import tradeRoutes from './routes/trades';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Import socket handlers
import { setupSocketHandlers } from './services/socket';

// Import database
import { initializeDatabase } from './services/db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/traders', traderRoutes);
app.use('/api/trades', authMiddleware, tradeRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Error handling
app.use(errorHandler);

// Setup WebSocket
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Try to initialize database (optional - server can run with mock data)
  try {
    await initializeDatabase();
  } catch (dbError) {
    console.log('⚠️  Database not available - running with mock data only');
    console.log('   To enable full functionality, start PostgreSQL on port 5432');
  }

  httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 CyxTrade API Server                                  ║
║                                                           ║
║   Running on: http://localhost:${PORT}                      ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);

export { io };
