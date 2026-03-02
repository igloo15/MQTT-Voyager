"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
// ── Shared business logic (same classes used by Electron) ──────────────────────
const MqttService_1 = require("../../src/services/mqtt/MqttService");
const TopicTree_1 = require("../../src/services/mqtt/TopicTree");
const MessageHistory_1 = require("../../src/services/storage/MessageHistory");
// ── Web-specific storage (replaces electron-store / safeStorage) ───────────────
const ConnectionStore_1 = require("./storage/ConnectionStore");
const SettingsStore_1 = require("./storage/SettingsStore");
// ── Route handlers ─────────────────────────────────────────────────────────────
const connections_1 = require("./routes/connections");
const mqtt_1 = require("./routes/mqtt");
const messages_1 = require("./routes/messages");
const topics_1 = require("./routes/topics");
const filters_1 = require("./routes/filters");
const settings_1 = require("./routes/settings");
// ── Service instances ──────────────────────────────────────────────────────────
const mqttService = new MqttService_1.MqttService();
const topicTree = new TopicTree_1.TopicTree();
const connectionStore = new ConnectionStore_1.ConnectionStore();
const settingsStore = new SettingsStore_1.SettingsStore();
const DATA_DIR = process.env.DATA_DIR || path_1.default.join(process.cwd(), 'data');
const messageHistory = new MessageHistory_1.MessageHistory(path_1.default.join(DATA_DIR, 'messages.db'));
// ── Express + Socket.IO setup ──────────────────────────────────────────────────
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', credentials: true },
});
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
// Inject services into request context via app.locals
app.locals.mqttService = mqttService;
app.locals.topicTree = topicTree;
app.locals.messageHistory = messageHistory;
app.locals.connectionStore = connectionStore;
app.locals.settingsStore = settingsStore;
app.locals.io = io;
// Helper: detect MessagePack payload (mirrors logic in src/index.ts)
function isMsgpackPayload(payload) {
    if (!payload || payload.length === 0)
        return false;
    const firstByte = payload[0];
    return ((firstByte >= 0x80 && firstByte <= 0x9f) || // fixmap or fixarray
        (firstByte >= 0xa0 && firstByte <= 0xbf) || // fixstr
        (firstByte >= 0xc0 && firstByte <= 0xdf) || // various types
        firstByte === 0xdc || firstByte === 0xdd || // array 16/32
        firstByte === 0xde || firstByte === 0xdf // map 16/32
    );
}
// ── Forward MQTT events to Socket.IO ──────────────────────────────────────────
mqttService.on('message', (message) => {
    const isMsgpack = Buffer.isBuffer(message.payload) && isMsgpackPayload(message.payload);
    const messageWithFlag = { ...message, isMsgpack };
    messageHistory.addMessage(messageWithFlag);
    topicTree.addMessage(messageWithFlag);
    // Encode payload for web transmission (mirrors Electron IPC behavior)
    let payload;
    if (Buffer.isBuffer(message.payload)) {
        payload = isMsgpack
            ? message.payload.toString('base64')
            : message.payload.toString('utf-8');
    }
    else {
        payload = message.payload;
    }
    io.emit('mqtt:message', { ...messageWithFlag, payload });
    io.emit('topics:updated', topicTree.toJSON());
});
mqttService.on('status', (status) => io.emit('mqtt:status', status));
mqttService.on('error', (error) => io.emit('mqtt:error', error));
// ── REST API routes ────────────────────────────────────────────────────────────
app.use('/api/connections', connections_1.connectionsRouter);
app.use('/api/mqtt', mqtt_1.mqttRouter);
app.use('/api/messages', messages_1.messagesRouter);
app.use('/api/topics', topics_1.topicsRouter);
app.use('/api/filters', filters_1.filtersRouter);
app.use('/api/settings', settings_1.settingsRouter);
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
const webDistPath = path_1.default.join(process.cwd(), 'dist', 'web');
app.use(express_1.default.static(webDistPath));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(webDistPath, 'index.html'));
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
//# sourceMappingURL=index.js.map