import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import path from 'path';
import { Server } from 'socket.io';
import { syncAchievementCatalog } from './data/achievementsCatalog';
import achievementRoutes from './routes/achievementRoutes';
import gameRoutes from './routes/gameRoutes';
import lobbyRoutes from './routes/lobbyRoutes';
import notificationRoutes from './routes/notificationRoutes';

import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import aiRoutes from './routes/aiRoutes';
import bettingRoutes from './routes/bettingRoutes';
import { GameSocketHandler } from './sockets/gameSocket';
import { ChatSocketHandler } from './sockets/chatSocket';
import { GameService } from './services/gameService';
import { ChatService } from './services/chatService';
import { FriendshipService } from './services/friendshipService';
import { ChatRepository } from './domain/ChatRepository';
import { FriendshipRepository } from './domain/FriendshipRepository';


dotenv.config();

// Create a shared GameService instance
const gameService = new GameService();
// Create chat infrastructure
const chatRepository = new ChatRepository();
const friendshipRepository = new FriendshipRepository();
const friendshipService = new FriendshipService(friendshipRepository);
const chatService = new ChatService(chatRepository, friendshipService);

// Enhanced logging utility
const log = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error ? error.stack || error : '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for access logs (append to file)
const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });

// Custom Morgan token for request body
morgan.token('body', (req: any) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body);
  }
  return '-';
});

const morganFormat = ':date[iso] :method :url :status - :body';

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000"
}));
app.use(express.json());

// Request logging with Morgan - log to both file and console
app.use(morgan(morganFormat, { stream: accessLogStream })); // Log to file with request body
app.use(morgan('combined')); // Log to console with standard Apache combined format

// Serve static files from docs directory
// From dist/index.js, go up to server/, then up to project root, then into docs/
const docsPath = path.resolve(__dirname, '../../docs');
console.log('Serving docs from:', docsPath);
console.log('__dirname is:', __dirname);
app.use('/docs', express.static(docsPath));

// Routes
app.use('/api/games', gameRoutes(gameService));
app.use('/api/users', achievementRoutes());
app.use('/api/users', userRoutes());
app.use('/api/lobbies', lobbyRoutes());
app.use('/api/notifications', notificationRoutes());
app.use('/api/ai', aiRoutes(gameService));
app.use('/api/bets', bettingRoutes);
app.use('/api/chat', chatRoutes(chatService, friendshipService));

// API Documentation endpoint
app.get('/api-spec', (req, res) => {
  const specPath = path.resolve(__dirname, '../../docs/api-spec.yaml');
  res.sendFile(specPath);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Seed achievements catalog (idempotent on code)
syncAchievementCatalog();

// Socket.IO handling
const gameSocketHandler = new GameSocketHandler(io, gameService);
const chatSocketHandler = new ChatSocketHandler(io, chatService);

// Store io and chatService in app for access in controllers
app.set('io', io);
app.set('chatService', chatService);

// Wire up chat handler to game socket handler
gameSocketHandler.setChatSocketHandler(chatSocketHandler);
gameSocketHandler.initialize();

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled for client: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
});

export default app;
