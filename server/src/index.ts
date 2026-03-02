import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';

// ── Shared business logic (same classes used by Electron) ──────────────────────
import { MqttService } from '../../src/services/mqtt/MqttService';
import { TopicTree } from '../../src/services/mqtt/TopicTree';
import { MessageHistory } from '../../src/services/storage/MessageHistory';

// ── Web-specific storage (replaces electron-store / safeStorage) ───────────────
import { ConnectionStore } from './storage/ConnectionStore';
import { SettingsStore } from './storage/SettingsStore';

// ── Route handlers ─────────────────────────────────────────────────────────────
import { connectionsRouter } from './routes/connections';
import { mqttRouter } from './routes/mqtt';
import { messagesRouter } from './routes/messages';
import { topicsRouter } from './routes/topics';
import { filtersRouter } from './routes/filters';
import { settingsRouter } from './routes/settings';

// ── Service instances ──────────────────────────────────────────────────────────
const mqttService = new MqttService();
const topicTree = new TopicTree();
const connectionStore = new ConnectionStore();
const settingsStore = new SettingsStore();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const messageHistory = new MessageHistory(path.join(DATA_DIR, 'messages.db'));

// ── Express + Socket.IO setup ──────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*', credentials: true },
});

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Inject services into request context via app.locals
app.locals.mqttService = mqttService;
app.locals.topicTree = topicTree;
app.locals.messageHistory = messageHistory;
app.locals.connectionStore = connectionStore;
app.locals.settingsStore = settingsStore;
app.locals.io = io;

// Helper: detect MessagePack payload (mirrors logic in src/index.ts)
function isMsgpackPayload(payload: Buffer): boolean {
  if (!payload || payload.length === 0) return false;
  const firstByte = payload[0];
  return (
    (firstByte >= 0x80 && firstByte <= 0x9f) || // fixmap or fixarray
    (firstByte >= 0xa0 && firstByte <= 0xbf) || // fixstr
    (firstByte >= 0xc0 && firstByte <= 0xdf) || // various types
    firstByte === 0xdc || firstByte === 0xdd ||  // array 16/32
    firstByte === 0xde || firstByte === 0xdf     // map 16/32
  );
}

// ── Forward MQTT events to Socket.IO ──────────────────────────────────────────
mqttService.on('message', (message) => {
  const isMsgpack = Buffer.isBuffer(message.payload) && isMsgpackPayload(message.payload);
  const messageWithFlag = { ...message, isMsgpack };

  messageHistory.addMessage(messageWithFlag);
  topicTree.addMessage(messageWithFlag);

  // Encode payload for web transmission (mirrors Electron IPC behavior)
  let payload: string;
  if (Buffer.isBuffer(message.payload)) {
    payload = isMsgpack
      ? message.payload.toString('base64')
      : message.payload.toString('utf-8');
  } else {
    payload = message.payload;
  }

  io.emit('mqtt:message', { ...messageWithFlag, payload });
  io.emit('topics:updated', topicTree.toJSON());
});

mqttService.on('status', (status) => io.emit('mqtt:status', status));
mqttService.on('error', (error) => io.emit('mqtt:error', error));

// ── REST API routes ────────────────────────────────────────────────────────────
app.use('/api/connections', connectionsRouter);
app.use('/api/mqtt', mqttRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/info', (_req, res) => {
  res.json({
    version: process.env.npm_package_version || '0.0.0',
    nodeVersion: process.version,
  });
});

// ── Serve built React frontend ─────────────────────────────────────────────────
// Use process.cwd() (= /app in Docker, project root locally) rather than
// __dirname because the compiled server is nested at
// dist/server/server/src/index.js and __dirname-relative paths are fragile.
const webDistPath = path.join(process.cwd(), 'dist', 'web');
app.use(express.static(webDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`MQTT Voyager running at http://localhost:${PORT}`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  if (mqttService.isConnected()) {
    await mqttService.disconnect();
  }
  messageHistory.close();
  process.exit(0);
});
