import { getToken } from './api';

type WsHandler = (data: unknown) => void;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Map<string, Set<WsHandler>>();

export function connectWs(): void {
  const token = getToken();
  if (!token || ws?.readyState === WebSocket.OPEN) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const typeHandlers = handlers.get(msg.type);
      if (typeHandlers) {
        typeHandlers.forEach(h => h(msg.data));
      }
      // Also broadcast to wildcard listeners
      const allHandlers = handlers.get('*');
      if (allHandlers) {
        allHandlers.forEach(h => h(msg));
      }
    } catch {
      // Ignore parse errors
    }
  };

  ws.onclose = () => {
    ws = null;
    // Reconnect after 3 seconds
    reconnectTimer = setTimeout(connectWs, 3000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnectWs(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
}

export function subscribeWs(type: string, handler: WsHandler): () => void {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);
  return () => {
    handlers.get(type)?.delete(handler);
  };
}

export function sendWsMessage(data: unknown): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}
