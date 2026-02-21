import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../middleware/auth.js';
import { getDb } from '../models/database.js';
import type { Server } from 'http';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  matchSubscriptions?: Set<string>;
  isAlive?: boolean;
}

const clients = new Map<string, Set<AuthenticatedSocket>>();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket, req: IncomingMessage) => {
    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const payload = verifyToken(token);
      ws.userId = payload.user_id;
      ws.matchSubscriptions = new Set();
      ws.isAlive = true;

      // Register client
      if (!clients.has(payload.user_id)) {
        clients.set(payload.user_id, new Set());
      }
      clients.get(payload.user_id)!.add(ws);

      // Auto-subscribe to user's matches
      const db = getDb();
      const matches = db.prepare(
        'SELECT match_id FROM matches WHERE (player_a_user_id = ? OR player_b_user_id = ?) AND status IN (?, ?, ?)'
      ).all(payload.user_id, payload.user_id, 'pending', 'scheduling', 'confirmed') as { match_id: string }[];

      for (const m of matches) {
        ws.matchSubscriptions.add(m.match_id);
      }

      ws.send(JSON.stringify({ type: 'connected', data: { user_id: payload.user_id, subscribed_matches: matches.map(m => m.match_id) } }));

    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // Handle subscribe/unsubscribe to specific matches
        if (msg.type === 'subscribe' && msg.match_id) {
          ws.matchSubscriptions?.add(msg.match_id);
        }
        if (msg.type === 'unsubscribe' && msg.match_id) {
          ws.matchSubscriptions?.delete(msg.match_id);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const userClients = clients.get(ws.userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(ws.userId);
          }
        }
      }
    });
  });

  // Heartbeat to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedSocket;
      if (!authWs.isAlive) {
        ws.terminate();
        return;
      }
      authWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastToMatch(matchId: string, message: unknown): void {
  const payload = JSON.stringify(message);
  for (const [, userSockets] of clients) {
    for (const ws of userSockets) {
      if (ws.matchSubscriptions?.has(matchId) && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export function broadcastToUser(userId: string, message: unknown): void {
  const userSockets = clients.get(userId);
  if (!userSockets) return;
  const payload = JSON.stringify(message);
  for (const ws of userSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastToAll(message: unknown): void {
  const payload = JSON.stringify(message);
  for (const [, userSockets] of clients) {
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
