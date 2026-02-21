import express from 'express';
import cors from 'cors';
import http from 'http';
import { initDb } from './models/database.js';
import { setupWebSocket } from './services/websocket.js';
import { authenticate } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import matchesRouter from './routes/matches.js';
import availabilityRouter from './routes/availability.js';
import chatRouter from './routes/chat.js';
import announcementsRouter from './routes/announcements.js';
import adminRouter from './routes/admin.js';

const PORT = parseInt(process.env.PORT || '3001');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

// Initialize database
initDb();
console.log('Database initialized');

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public auth routes (no authentication needed for login)
app.use('/auth', authRouter);

// Protected routes - need auth middleware applied within routers or here
app.use('/auth', authenticate, authRouter);  // /auth/me needs auth
app.use('/matches', matchesRouter);
app.use('/matches/:match_id/availability', availabilityRouter);
app.use('/matches/:match_id/messages', chatRouter);
app.use('/matches/:match_id', chatRouter);  // For /schedule/approve
app.use('/announcements', announcementsRouter);
app.use('/admin', adminRouter);

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

export default app;
